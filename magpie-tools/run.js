#!/usr/bin/env node
/**
 * Magpie 网关 MCP 插件工具客户端
 *
 * 通过 Magpie 网关的 MCP streamable HTTP 端点（无状态直调，无需 initialize）
 * 列出并调用插件工具：search1api_*（网页搜索 / 新闻 / 网页抓取）与
 * goanyapi_*（网站流量、域名权重 DR/反链、关键词难度/搜索量/建议、
 * Google/Bing/YouTube 自动补全、credits 余额等）。工具清单随网关插件开关变化。
 *
 * 用法:
 *   node skill.js list [关键词] [options]
 *   node skill.js call <tool> [options]
 *
 * 命令:
 *   list                表格列出全部工具：名称、必填参数、描述
 *   list <关键词>       只列名称或描述含关键词的工具（不区分大小写）
 *   call <tool>         调用指定工具（无参数工具直接调用）
 *
 * 安全约定:
 *   API Key 只从环境变量或 .env 读取，绝不硬编码、绝不打印到 stdout。
 */

const fs = require("fs");
const path = require("path");

// 版本号由 build.js 通过 define: { __VERSION } 注入
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "dev";

const DEFAULT_TOOLS_URL = "http://localhost:3425/mcp/magpie/tools";
const DEFAULT_TIMEOUT_MS = 60000;

// 退出码沿用 deepseek-search 约定：0 成功 / 1 API 错误 / 2 用法错误 / 3 缺少 Key
const EXIT_CODES = { OK: 0, API: 1, USAGE: 2, NO_KEY: 3 };

// ===================== 错误契约 =====================

function makeError(error, message) {
  return { error, message };
}

function printError(err) {
  console.error(JSON.stringify(err, null, 2));
}

// ===================== .env 手写解析（无依赖，环境变量优先） =====================

/**
 * 解析 .env 文本为键值对象
 */
function parseEnvText(content) {
  const values = {};
  if (typeof content !== "string" || !content) return values;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) values[key] = val;
  }
  return values;
}

/**
 * 加载 <skillDir>/.env；已存在的环境变量不覆盖（优先级：环境变量 > .env）
 */
function loadDotEnv(skillDir) {
  const envPath = path.join(skillDir, ".env");
  try {
    if (!fs.existsSync(envPath)) return;
    const values = parseEnvText(fs.readFileSync(envPath, "utf8"));
    for (const [key, val] of Object.entries(values)) {
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    // .env 读取失败不致命，继续走环境变量 / 默认值
  }
}

loadDotEnv(__dirname);

// ===================== 配置解析 =====================

/**
 * 配置优先级: 命令行 --timeout > 环境变量 > .env（已在启动时注入） > 默认值
 */
function getConfig(opts) {
  const url = (process.env.MAGPIE_TOOLS_URL || DEFAULT_TOOLS_URL).trim();
  const apiKey = (process.env.MAGPIE_API_KEY || "").trim();

  let timeoutMs = DEFAULT_TIMEOUT_MS;
  const envTimeout = parseInt(process.env.MAGPIE_TIMEOUT_MS, 10);
  if (Number.isFinite(envTimeout) && envTimeout > 0) timeoutMs = envTimeout;
  if (opts && opts.timeout !== undefined) {
    const cliTimeout = parseInt(opts.timeout, 10);
    if (Number.isFinite(cliTimeout) && cliTimeout > 0) timeoutMs = cliTimeout;
  }

  return { url, apiKey, timeoutMs };
}

// ===================== argv 解析 =====================

/**
 * 解析命令行参数
 * 布尔选项: --json / -h / --help / -v / --version
 * 带值选项: --timeout / --args / --arg（--arg 可重复）
 */
function parseArgv(argv) {
  const opts = { arg: [] };
  const positional = [];
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (token === "-h") {
      opts.help = true;
      i++;
      continue;
    }
    if (token === "-v") {
      opts.version = true;
      i++;
      continue;
    }
    if (token.startsWith("--")) {
      const key = token.slice(2);
      switch (key) {
        case "json":
          opts.json = true;
          i++;
          break;
        case "help":
          opts.help = true;
          i++;
          break;
        case "version":
          opts.version = true;
          i++;
          break;
        case "timeout":
        case "args":
        case "arg": {
          const value = argv[i + 1];
          if (value === undefined || value.startsWith("--")) {
            return { err: makeError("参数错误", `选项 --${key} 需要一个值`) };
          }
          if (key === "arg") opts.arg.push(value);
          else opts[key] = value;
          i += 2;
          break;
        }
        default:
          return {
            err: makeError(
              "参数错误",
              `未知选项: --${key}（可用选项: --arg / --args / --json / --timeout / --help / --version）`
            ),
          };
      }
    } else {
      positional.push(token);
      i++;
    }
  }
  return { opts, positional };
}

// ===================== call 参数构造 =====================

/**
 * 构造工具调用参数对象。
 * --args 提供完整 JSON 对象；--arg k=v 逐个叠加，后到者优先（可覆盖 --args 同名键）。
 * --arg 的值先尝试 JSON.parse（k=5 得数字、k=["a","b"] 得数组），失败按原样字符串。
 */
function buildToolArgs(opts) {
  let args = {};
  if (opts.args !== undefined) {
    let parsed;
    try {
      parsed = JSON.parse(opts.args);
    } catch (e) {
      return { err: makeError("参数错误", `--args 不是合法 JSON：${e.message}`) };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { err: makeError("参数错误", '--args 必须是 JSON 对象，例如 \'{"query":"x"}\'') };
    }
    args = parsed;
  }
  for (const kv of opts.arg || []) {
    const eq = kv.indexOf("=");
    if (eq <= 0) {
      return { err: makeError("参数错误", `--arg 需要 k=v 形式，收到: ${kv}（值含空格时请整体加引号）`) };
    }
    const key = kv.slice(0, eq).trim();
    const rawValue = kv.slice(eq + 1);
    let value;
    try {
      value = JSON.parse(rawValue);
    } catch (e) {
      value = rawValue; // 非 JSON 一律按原样字符串
    }
    args[key] = value;
  }
  return { args };
}

// ===================== MCP 客户端（streamable HTTP 无状态直调） =====================

/**
 * 发送一次 JSON-RPC 请求。端点无状态，无需 initialize，直接 POST 即可，
 * 响应为 application/json（非 SSE）。
 * @returns {{ok:true, result:object}|{ok:false, err:{error,message}}}
 */
async function mcpRequest(cfg, method, params) {
  const body = { jsonrpc: "2.0", id: 1, method };
  if (params !== undefined) body.params = params;

  let res;
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
  } catch (e) {
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) {
      return {
        ok: false,
        err: makeError(
          "请求超时",
          `请求在 ${cfg.timeoutMs}ms 内未完成。可用 --timeout 调大后重试，或用 MAGPIE_TIMEOUT_MS 配置默认超时。`
        ),
      };
    }
    const cause = e && e.cause && e.cause.code ? `（${e.cause.code}）` : "";
    return {
      ok: false,
      err: makeError(
        "连接失败",
        `无法连接 Magpie 网关 ${cfg.url}${cause}：${e && e.message ? e.message : String(e)}。请检查网关是否在线、MAGPIE_TOOLS_URL 是否正确。`
      ),
    };
  }

  let text = "";
  try {
    text = await res.text();
  } catch (e) {
    // 读取响应体失败按空文本处理，走下方错误分支
  }

  let data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    // 鉴权失败为 OpenAI 风格 {"error":{"message":"...","type":"authentication_error"}}
    const detail =
      (data && data.error && typeof data.error === "object" && data.error.message) ||
      (data && typeof data.error === "string" ? data.error : "") ||
      (text ? text.slice(0, 200) : `HTTP ${res.status}`);
    if (res.status === 401) {
      return {
        ok: false,
        err: makeError(
          "鉴权失败",
          `Magpie 网关拒绝了 API Key：${detail}。请检查 MAGPIE_API_KEY（.env 或环境变量）。`
        ),
      };
    }
    return { ok: false, err: makeError(`HTTP ${res.status}`, detail) };
  }

  if (data === null) {
    return {
      ok: false,
      err: makeError("响应格式异常", `网关返回的不是合法 JSON（HTTP ${res.status}）：${text.slice(0, 200)}`),
    };
  }

  // HTTP 200 但 JSON-RPC 层错误（如未知工具名 {"error":{"code":-32602,"message":"..."}}）
  if (data.error) {
    const code = typeof data.error.code !== "undefined" ? `（code ${data.error.code}）` : "";
    return {
      ok: false,
      err: makeError("工具调用失败", `网关返回 JSON-RPC 错误${code}：${data.error.message || "未知错误"}`),
    };
  }

  if (!data.result) {
    return { ok: false, err: makeError("响应格式异常", "网关返回的 JSON-RPC 响应缺少 result 字段") };
  }
  return { ok: true, result: data.result };
}

// ===================== 二次 JSON 解包 =====================

/**
 * 关键坑：网关把插件结果二次 JSON.stringify 后塞进 result.content[0].text，
 * 内容形如 {content:[{type:"text",text:"..."}], structuredContent:{...}}。
 * 这里尝试再解析一层：解析成功且含 structuredContent 或 content 才算解包成功。
 * @returns {object|null} 解包成功返回内层对象，失败返回 null
 */
function unwrapToolText(text) {
  let inner;
  try {
    inner = JSON.parse(text);
  } catch (e) {
    return null;
  }
  if (
    inner &&
    typeof inner === "object" &&
    !Array.isArray(inner) &&
    (Object.prototype.hasOwnProperty.call(inner, "structuredContent") ||
      Object.prototype.hasOwnProperty.call(inner, "content"))
  ) {
    return inner;
  }
  return null;
}

// ===================== 命令实现 =====================

/**
 * list：表格列出工具（名称 / 必填参数 / 描述），支持关键词过滤与 --json
 */
async function cmdList(opts, keyword, cfg) {
  const resp = await mcpRequest(cfg, "tools/list", {});
  if (!resp.ok) {
    printError(resp.err);
    return EXIT_CODES.API;
  }

  const tools = resp.result.tools;
  if (!Array.isArray(tools)) {
    printError(makeError("响应格式异常", "tools/list 响应缺少 tools 数组"));
    return EXIT_CODES.API;
  }

  const lower = keyword.toLowerCase();
  const filtered = keyword
    ? tools.filter((t) => {
        const name = String(t.name || "");
        const desc = String(t.description || "");
        return name.toLowerCase().includes(lower) || desc.toLowerCase().includes(lower);
      })
    : tools;

  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return EXIT_CODES.OK;
  }

  if (filtered.length === 0) {
    console.log(`未找到名称或描述包含 "${keyword}" 的工具（当前共 ${tools.length} 个工具）`);
    return EXIT_CODES.OK;
  }

  const rows = filtered.map((t) => {
    const schema = t.inputSchema || {};
    const required =
      Array.isArray(schema.required) && schema.required.length ? schema.required.join(",") : "-";
    const desc = String(t.description || "").replace(/\s*\n\s*/g, " ").trim() || "-";
    return [String(t.name || "-"), required, desc];
  });
  const wName = Math.max("工具名".length, ...rows.map((r) => r[0].length));
  const wReq = Math.max("必填参数".length, ...rows.map((r) => r[1].length));
  let out = `${"工具名".padEnd(wName)}  ${"必填参数".padEnd(wReq)}  描述\n`;
  for (const r of rows) {
    out += `${r[0].padEnd(wName)}  ${r[1].padEnd(wReq)}  ${r[2]}\n`;
  }
  out += `\n共 ${filtered.length} 个工具${keyword ? `（关键词: ${keyword}）` : ""}`;
  console.log(out);
  return EXIT_CODES.OK;
}

/**
 * call：调用指定工具并输出结果
 */
async function cmdCall(opts, toolName, cfg) {
  const built = buildToolArgs(opts);
  if (built.err) {
    printError(built.err);
    return EXIT_CODES.USAGE;
  }

  const resp = await mcpRequest(cfg, "tools/call", { name: toolName, arguments: built.args });
  if (!resp.ok) {
    printError(resp.err);
    return EXIT_CODES.API;
  }

  const result = resp.result;
  const firstText =
    Array.isArray(result.content) && result.content[0] && typeof result.content[0].text === "string"
      ? result.content[0].text
      : null;

  // 工具执行错误：isError=true，错误信息也在 content 里
  if (result.isError) {
    printError(makeError("工具执行失败", firstText || "网关返回 isError=true 但未提供错误详情"));
    return EXIT_CODES.API;
  }

  if (firstText === null) {
    // 无 content 文本：原样输出 result
    console.log(JSON.stringify(result, null, 2));
    return EXIT_CODES.OK;
  }

  // 尝试解开网关的二次 JSON.stringify
  const inner = unwrapToolText(firstText);
  if (inner) {
    if (opts.json) {
      // --json：输出解包后的完整结果对象
      console.log(JSON.stringify(inner, null, 2));
      return EXIT_CODES.OK;
    }
    if (inner.structuredContent !== undefined) {
      // 优先 structuredContent（机器可读数据）
      const sc = inner.structuredContent;
      console.log(typeof sc === "string" ? sc : JSON.stringify(sc, null, 2));
      return EXIT_CODES.OK;
    }
    const texts = (Array.isArray(inner.content) ? inner.content : [])
      .map((c) => (c && typeof c.text === "string" ? c.text : ""))
      .filter(Boolean);
    if (texts.length) {
      console.log(texts.join("\n"));
      return EXIT_CODES.OK;
    }
    console.log(JSON.stringify(inner, null, 2));
    return EXIT_CODES.OK;
  }

  // 解包失败：原样输出 text
  console.log(firstText);
  return EXIT_CODES.OK;
}

// ===================== 帮助 =====================

function showHelp() {
  console.log(`
Magpie 网关 MCP 插件工具客户端 v${SKILL_VERSION}

通过 Magpie 网关的 MCP streamable HTTP 端点（无状态直调）调用插件工具：
search1api_*（网页搜索 / 新闻 / 网页抓取）、goanyapi_*（网站流量、域名权重、
关键词、自动补全、credits 余额等）。工具清单随网关插件开关变化。

用法:
  node skill.js list [关键词] [options]
  node skill.js call <tool> [options]

命令:
  list                表格列出全部工具：名称、必填参数、描述
  list <关键词>       只列名称或描述含关键词的工具（不区分大小写）
  call <tool>         调用指定工具（无参数工具直接调用）

选项:
  --arg <k=v>           call 参数，可重复；值先尝试 JSON 解析（k=5 得数字、
                        k='["a","b"]' 得数组），失败按原样字符串
  --args '<JSON对象>'   call 一次性传入完整参数对象；与 --arg 混用时 --arg 优先生效
  --json                list 输出原始 tools 数组；call 输出解包后的完整结果对象
  --timeout <ms>        请求超时毫秒（默认读 MAGPIE_TIMEOUT_MS 或 60000）
  -h, --help            显示帮助
  -v, --version         显示版本

示例:
  node skill.js list
  node skill.js list credits
  node skill.js call goanyapi_credits_balance
  node skill.js call search1api_web_search --arg query=deepseek --arg maxResults=5
  node skill.js call search1api_web_search --args '{"query":"deepseek","maxResults":5}' --json

环境变量:
  MAGPIE_TOOLS_URL     MCP 端点（默认 http://localhost:3425/mcp/magpie/tools）
  MAGPIE_API_KEY       Magpie 网关密钥（必需，缺失时以退出码 3 报错）
  MAGPIE_TIMEOUT_MS    默认请求超时毫秒（默认 60000）

配置优先级: 命令行选项 > 环境变量 > .env（技能目录下，不入库） > 默认值

避坑:
  1. 端点无状态，无需 MCP initialize，直接 list / call 即可
  2. 工具名格式 <插件>_<工具> 且随网关插件开关变化，先 list 再 call
  3. 部分工具消耗 goanyapi credits，可先 call goanyapi_credits_balance 查询余额
`);
}

// ===================== 主入口 =====================

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    showHelp();
    return EXIT_CODES.OK;
  }

  const parsed = parseArgv(argv);
  if (parsed.err) {
    printError(parsed.err);
    return EXIT_CODES.USAGE;
  }
  const { opts, positional } = parsed;

  if (opts.help) {
    showHelp();
    return EXIT_CODES.OK;
  }
  if (opts.version) {
    console.log(`Magpie 网关 MCP 插件工具客户端 v${SKILL_VERSION}`);
    return EXIT_CODES.OK;
  }

  const command = positional[0];
  if (command !== "list" && command !== "call") {
    printError(makeError("用法错误", `未知命令: ${command}（可用命令: list / call，--help 查看帮助）`));
    return EXIT_CODES.USAGE;
  }

  // --timeout 校验
  if (opts.timeout !== undefined) {
    const t = parseInt(opts.timeout, 10);
    if (!Number.isFinite(t) || t <= 0) {
      printError(makeError("参数错误", `--timeout 需要正整数毫秒值，收到: ${opts.timeout}`));
      return EXIT_CODES.USAGE;
    }
  }

  const cfg = getConfig(opts);

  // 位置参数校验
  if (command === "list") {
    if (positional.length > 2) {
      printError(makeError("用法错误", "list 命令最多接受一个关键词参数"));
      return EXIT_CODES.USAGE;
    }
  } else {
    if (!positional[1]) {
      printError(
        makeError("用法错误", "call 命令需要工具名参数: node skill.js call <tool>（先 list 查看可用工具）")
      );
      return EXIT_CODES.USAGE;
    }
    if (positional.length > 2) {
      printError(
        makeError(
          "用法错误",
          `多余参数: ${positional.slice(2).join(" ")}（--arg 的值含空格时请整体加引号: --arg "k=v v"）`
        )
      );
      return EXIT_CODES.USAGE;
    }
  }

  // 缺 Key 检查放在用法校验之后，保证用法错误优先于缺 Key 的退出码
  if (!cfg.apiKey) {
    printError(
      makeError(
        "缺少 API Key",
        `未设置 MAGPIE_API_KEY。请在 ${path.join(__dirname, ".env")} 中配置（参考 .env.example），或设置同名环境变量。`
      )
    );
    return EXIT_CODES.NO_KEY;
  }

  if (command === "list") return cmdList(opts, positional[1] || "", cfg);
  return cmdCall(opts, positional[1], cfg);
}

main()
  .then((code) => {
    process.exitCode = typeof code === "number" ? code : EXIT_CODES.OK;
  })
  .catch((e) => {
    // 兜底：绝不抛出堆栈，也绝不回显任何请求内容
    printError(makeError("内部错误", e && e.message ? e.message : String(e)));
    process.exitCode = EXIT_CODES.API;
  });
