#!/usr/bin/env node
// Magpie 网关 MCP 插件工具客户端 v261031.001406 - 无需安装依赖


// run.js
var fs = require("fs");
var path = require("path");
var SKILL_VERSION = true ? "261031.001406" : "dev";
var DEFAULT_TOOLS_URL = "http://localhost:3425/mcp/magpie/tools";
var DEFAULT_TIMEOUT_MS = 6e4;
var EXIT_CODES = { OK: 0, API: 1, USAGE: 2, NO_KEY: 3 };
function makeError(error, message) {
  return { error, message };
}
function printError(err) {
  console.error(JSON.stringify(err, null, 2));
}
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
function loadDotEnv(skillDir) {
  const envPath = path.join(skillDir, ".env");
  try {
    if (!fs.existsSync(envPath)) return;
    const values = parseEnvText(fs.readFileSync(envPath, "utf8"));
    for (const [key, val] of Object.entries(values)) {
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
  }
}
loadDotEnv(__dirname);
function getConfig(opts) {
  const url = (process.env.MAGPIE_TOOLS_URL || DEFAULT_TOOLS_URL).trim();
  const apiKey = (process.env.MAGPIE_API_KEY || "").trim();
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  const envTimeout = parseInt(process.env.MAGPIE_TIMEOUT_MS, 10);
  if (Number.isFinite(envTimeout) && envTimeout > 0) timeoutMs = envTimeout;
  if (opts && opts.timeout !== void 0) {
    const cliTimeout = parseInt(opts.timeout, 10);
    if (Number.isFinite(cliTimeout) && cliTimeout > 0) timeoutMs = cliTimeout;
  }
  return { url, apiKey, timeoutMs };
}
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
          if (value === void 0 || value.startsWith("--")) {
            return { err: makeError("\u53C2\u6570\u9519\u8BEF", `\u9009\u9879 --${key} \u9700\u8981\u4E00\u4E2A\u503C`) };
          }
          if (key === "arg") opts.arg.push(value);
          else opts[key] = value;
          i += 2;
          break;
        }
        default:
          return {
            err: makeError(
              "\u53C2\u6570\u9519\u8BEF",
              `\u672A\u77E5\u9009\u9879: --${key}\uFF08\u53EF\u7528\u9009\u9879: --arg / --args / --json / --timeout / --help / --version\uFF09`
            )
          };
      }
    } else {
      positional.push(token);
      i++;
    }
  }
  return { opts, positional };
}
function buildToolArgs(opts) {
  let args = {};
  if (opts.args !== void 0) {
    let parsed;
    try {
      parsed = JSON.parse(opts.args);
    } catch (e) {
      return { err: makeError("\u53C2\u6570\u9519\u8BEF", `--args \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e.message}`) };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { err: makeError("\u53C2\u6570\u9519\u8BEF", `--args \u5FC5\u987B\u662F JSON \u5BF9\u8C61\uFF0C\u4F8B\u5982 '{"query":"x"}'`) };
    }
    args = parsed;
  }
  for (const kv of opts.arg || []) {
    const eq = kv.indexOf("=");
    if (eq <= 0) {
      return { err: makeError("\u53C2\u6570\u9519\u8BEF", `--arg \u9700\u8981 k=v \u5F62\u5F0F\uFF0C\u6536\u5230: ${kv}\uFF08\u503C\u542B\u7A7A\u683C\u65F6\u8BF7\u6574\u4F53\u52A0\u5F15\u53F7\uFF09`) };
    }
    const key = kv.slice(0, eq).trim();
    const rawValue = kv.slice(eq + 1);
    let value;
    try {
      value = JSON.parse(rawValue);
    } catch (e) {
      value = rawValue;
    }
    args[key] = value;
  }
  return { args };
}
async function mcpRequest(cfg, method, params) {
  const body = { jsonrpc: "2.0", id: 1, method };
  if (params !== void 0) body.params = params;
  let res;
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(cfg.timeoutMs)
    });
  } catch (e) {
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) {
      return {
        ok: false,
        err: makeError(
          "\u8BF7\u6C42\u8D85\u65F6",
          `\u8BF7\u6C42\u5728 ${cfg.timeoutMs}ms \u5185\u672A\u5B8C\u6210\u3002\u53EF\u7528 --timeout \u8C03\u5927\u540E\u91CD\u8BD5\uFF0C\u6216\u7528 MAGPIE_TIMEOUT_MS \u914D\u7F6E\u9ED8\u8BA4\u8D85\u65F6\u3002`
        )
      };
    }
    const cause = e && e.cause && e.cause.code ? `\uFF08${e.cause.code}\uFF09` : "";
    return {
      ok: false,
      err: makeError(
        "\u8FDE\u63A5\u5931\u8D25",
        `\u65E0\u6CD5\u8FDE\u63A5 Magpie \u7F51\u5173 ${cfg.url}${cause}\uFF1A${e && e.message ? e.message : String(e)}\u3002\u8BF7\u68C0\u67E5\u7F51\u5173\u662F\u5426\u5728\u7EBF\u3001MAGPIE_TOOLS_URL \u662F\u5426\u6B63\u786E\u3002`
      )
    };
  }
  let text = "";
  try {
    text = await res.text();
  } catch (e) {
  }
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const detail = data && data.error && typeof data.error === "object" && data.error.message || (data && typeof data.error === "string" ? data.error : "") || (text ? text.slice(0, 200) : `HTTP ${res.status}`);
    if (res.status === 401) {
      return {
        ok: false,
        err: makeError(
          "\u9274\u6743\u5931\u8D25",
          `Magpie \u7F51\u5173\u62D2\u7EDD\u4E86 API Key\uFF1A${detail}\u3002\u8BF7\u68C0\u67E5 MAGPIE_API_KEY\uFF08.env \u6216\u73AF\u5883\u53D8\u91CF\uFF09\u3002`
        )
      };
    }
    return { ok: false, err: makeError(`HTTP ${res.status}`, detail) };
  }
  if (data === null) {
    return {
      ok: false,
      err: makeError("\u54CD\u5E94\u683C\u5F0F\u5F02\u5E38", `\u7F51\u5173\u8FD4\u56DE\u7684\u4E0D\u662F\u5408\u6CD5 JSON\uFF08HTTP ${res.status}\uFF09\uFF1A${text.slice(0, 200)}`)
    };
  }
  if (data.error) {
    const code = typeof data.error.code !== "undefined" ? `\uFF08code ${data.error.code}\uFF09` : "";
    return {
      ok: false,
      err: makeError("\u5DE5\u5177\u8C03\u7528\u5931\u8D25", `\u7F51\u5173\u8FD4\u56DE JSON-RPC \u9519\u8BEF${code}\uFF1A${data.error.message || "\u672A\u77E5\u9519\u8BEF"}`)
    };
  }
  if (!data.result) {
    return { ok: false, err: makeError("\u54CD\u5E94\u683C\u5F0F\u5F02\u5E38", "\u7F51\u5173\u8FD4\u56DE\u7684 JSON-RPC \u54CD\u5E94\u7F3A\u5C11 result \u5B57\u6BB5") };
  }
  return { ok: true, result: data.result };
}
function unwrapToolText(text) {
  let inner;
  try {
    inner = JSON.parse(text);
  } catch (e) {
    return null;
  }
  if (inner && typeof inner === "object" && !Array.isArray(inner) && (Object.prototype.hasOwnProperty.call(inner, "structuredContent") || Object.prototype.hasOwnProperty.call(inner, "content"))) {
    return inner;
  }
  return null;
}
async function cmdList(opts, keyword, cfg) {
  const resp = await mcpRequest(cfg, "tools/list", {});
  if (!resp.ok) {
    printError(resp.err);
    return EXIT_CODES.API;
  }
  const tools = resp.result.tools;
  if (!Array.isArray(tools)) {
    printError(makeError("\u54CD\u5E94\u683C\u5F0F\u5F02\u5E38", "tools/list \u54CD\u5E94\u7F3A\u5C11 tools \u6570\u7EC4"));
    return EXIT_CODES.API;
  }
  const lower = keyword.toLowerCase();
  const filtered = keyword ? tools.filter((t) => {
    const name = String(t.name || "");
    const desc = String(t.description || "");
    return name.toLowerCase().includes(lower) || desc.toLowerCase().includes(lower);
  }) : tools;
  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return EXIT_CODES.OK;
  }
  if (filtered.length === 0) {
    console.log(`\u672A\u627E\u5230\u540D\u79F0\u6216\u63CF\u8FF0\u5305\u542B "${keyword}" \u7684\u5DE5\u5177\uFF08\u5F53\u524D\u5171 ${tools.length} \u4E2A\u5DE5\u5177\uFF09`);
    return EXIT_CODES.OK;
  }
  const rows = filtered.map((t) => {
    const schema = t.inputSchema || {};
    const required = Array.isArray(schema.required) && schema.required.length ? schema.required.join(",") : "-";
    const desc = String(t.description || "").replace(/\s*\n\s*/g, " ").trim() || "-";
    return [String(t.name || "-"), required, desc];
  });
  const wName = Math.max("\u5DE5\u5177\u540D".length, ...rows.map((r) => r[0].length));
  const wReq = Math.max("\u5FC5\u586B\u53C2\u6570".length, ...rows.map((r) => r[1].length));
  let out = `${"\u5DE5\u5177\u540D".padEnd(wName)}  ${"\u5FC5\u586B\u53C2\u6570".padEnd(wReq)}  \u63CF\u8FF0
`;
  for (const r of rows) {
    out += `${r[0].padEnd(wName)}  ${r[1].padEnd(wReq)}  ${r[2]}
`;
  }
  out += `
\u5171 ${filtered.length} \u4E2A\u5DE5\u5177${keyword ? `\uFF08\u5173\u952E\u8BCD: ${keyword}\uFF09` : ""}`;
  console.log(out);
  return EXIT_CODES.OK;
}
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
  const firstText = Array.isArray(result.content) && result.content[0] && typeof result.content[0].text === "string" ? result.content[0].text : null;
  if (result.isError) {
    printError(makeError("\u5DE5\u5177\u6267\u884C\u5931\u8D25", firstText || "\u7F51\u5173\u8FD4\u56DE isError=true \u4F46\u672A\u63D0\u4F9B\u9519\u8BEF\u8BE6\u60C5"));
    return EXIT_CODES.API;
  }
  if (firstText === null) {
    console.log(JSON.stringify(result, null, 2));
    return EXIT_CODES.OK;
  }
  const inner = unwrapToolText(firstText);
  if (inner) {
    if (opts.json) {
      console.log(JSON.stringify(inner, null, 2));
      return EXIT_CODES.OK;
    }
    if (inner.structuredContent !== void 0) {
      const sc = inner.structuredContent;
      console.log(typeof sc === "string" ? sc : JSON.stringify(sc, null, 2));
      return EXIT_CODES.OK;
    }
    const texts = (Array.isArray(inner.content) ? inner.content : []).map((c) => c && typeof c.text === "string" ? c.text : "").filter(Boolean);
    if (texts.length) {
      console.log(texts.join("\n"));
      return EXIT_CODES.OK;
    }
    console.log(JSON.stringify(inner, null, 2));
    return EXIT_CODES.OK;
  }
  console.log(firstText);
  return EXIT_CODES.OK;
}
function showHelp() {
  console.log(`
Magpie \u7F51\u5173 MCP \u63D2\u4EF6\u5DE5\u5177\u5BA2\u6237\u7AEF v${SKILL_VERSION}

\u901A\u8FC7 Magpie \u7F51\u5173\u7684 MCP streamable HTTP \u7AEF\u70B9\uFF08\u65E0\u72B6\u6001\u76F4\u8C03\uFF09\u8C03\u7528\u63D2\u4EF6\u5DE5\u5177\uFF1A
search1api_*\uFF08\u7F51\u9875\u641C\u7D22 / \u65B0\u95FB / \u7F51\u9875\u6293\u53D6\uFF09\u3001goanyapi_*\uFF08\u7F51\u7AD9\u6D41\u91CF\u3001\u57DF\u540D\u6743\u91CD\u3001
\u5173\u952E\u8BCD\u3001\u81EA\u52A8\u8865\u5168\u3001credits \u4F59\u989D\u7B49\uFF09\u3002\u5DE5\u5177\u6E05\u5355\u968F\u7F51\u5173\u63D2\u4EF6\u5F00\u5173\u53D8\u5316\u3002

\u7528\u6CD5:
  node skill.js list [\u5173\u952E\u8BCD] [options]
  node skill.js call <tool> [options]

\u547D\u4EE4:
  list                \u8868\u683C\u5217\u51FA\u5168\u90E8\u5DE5\u5177\uFF1A\u540D\u79F0\u3001\u5FC5\u586B\u53C2\u6570\u3001\u63CF\u8FF0
  list <\u5173\u952E\u8BCD>       \u53EA\u5217\u540D\u79F0\u6216\u63CF\u8FF0\u542B\u5173\u952E\u8BCD\u7684\u5DE5\u5177\uFF08\u4E0D\u533A\u5206\u5927\u5C0F\u5199\uFF09
  call <tool>         \u8C03\u7528\u6307\u5B9A\u5DE5\u5177\uFF08\u65E0\u53C2\u6570\u5DE5\u5177\u76F4\u63A5\u8C03\u7528\uFF09

\u9009\u9879:
  --arg <k=v>           call \u53C2\u6570\uFF0C\u53EF\u91CD\u590D\uFF1B\u503C\u5148\u5C1D\u8BD5 JSON \u89E3\u6790\uFF08k=5 \u5F97\u6570\u5B57\u3001
                        k='["a","b"]' \u5F97\u6570\u7EC4\uFF09\uFF0C\u5931\u8D25\u6309\u539F\u6837\u5B57\u7B26\u4E32
  --args '<JSON\u5BF9\u8C61>'   call \u4E00\u6B21\u6027\u4F20\u5165\u5B8C\u6574\u53C2\u6570\u5BF9\u8C61\uFF1B\u4E0E --arg \u6DF7\u7528\u65F6 --arg \u4F18\u5148\u751F\u6548
  --json                list \u8F93\u51FA\u539F\u59CB tools \u6570\u7EC4\uFF1Bcall \u8F93\u51FA\u89E3\u5305\u540E\u7684\u5B8C\u6574\u7ED3\u679C\u5BF9\u8C61
  --timeout <ms>        \u8BF7\u6C42\u8D85\u65F6\u6BEB\u79D2\uFF08\u9ED8\u8BA4\u8BFB MAGPIE_TIMEOUT_MS \u6216 60000\uFF09
  -h, --help            \u663E\u793A\u5E2E\u52A9
  -v, --version         \u663E\u793A\u7248\u672C

\u793A\u4F8B:
  node skill.js list
  node skill.js list credits
  node skill.js call goanyapi_credits_balance
  node skill.js call search1api_web_search --arg query=deepseek --arg maxResults=5
  node skill.js call search1api_web_search --args '{"query":"deepseek","maxResults":5}' --json

\u73AF\u5883\u53D8\u91CF:
  MAGPIE_TOOLS_URL     MCP \u7AEF\u70B9\uFF08\u9ED8\u8BA4 http://localhost:3425/mcp/magpie/tools\uFF09
  MAGPIE_API_KEY       Magpie \u7F51\u5173\u5BC6\u94A5\uFF08\u5FC5\u9700\uFF0C\u7F3A\u5931\u65F6\u4EE5\u9000\u51FA\u7801 3 \u62A5\u9519\uFF09
  MAGPIE_TIMEOUT_MS    \u9ED8\u8BA4\u8BF7\u6C42\u8D85\u65F6\u6BEB\u79D2\uFF08\u9ED8\u8BA4 60000\uFF09

\u914D\u7F6E\u4F18\u5148\u7EA7: \u547D\u4EE4\u884C\u9009\u9879 > \u73AF\u5883\u53D8\u91CF > .env\uFF08\u6280\u80FD\u76EE\u5F55\u4E0B\uFF0C\u4E0D\u5165\u5E93\uFF09 > \u9ED8\u8BA4\u503C

\u907F\u5751:
  1. \u7AEF\u70B9\u65E0\u72B6\u6001\uFF0C\u65E0\u9700 MCP initialize\uFF0C\u76F4\u63A5 list / call \u5373\u53EF
  2. \u5DE5\u5177\u540D\u683C\u5F0F <\u63D2\u4EF6>_<\u5DE5\u5177> \u4E14\u968F\u7F51\u5173\u63D2\u4EF6\u5F00\u5173\u53D8\u5316\uFF0C\u5148 list \u518D call
  3. \u90E8\u5206\u5DE5\u5177\u6D88\u8017 goanyapi credits\uFF0C\u53EF\u5148 call goanyapi_credits_balance \u67E5\u8BE2\u4F59\u989D
`);
}
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
    console.log(`Magpie \u7F51\u5173 MCP \u63D2\u4EF6\u5DE5\u5177\u5BA2\u6237\u7AEF v${SKILL_VERSION}`);
    return EXIT_CODES.OK;
  }
  const command = positional[0];
  if (command !== "list" && command !== "call") {
    printError(makeError("\u7528\u6CD5\u9519\u8BEF", `\u672A\u77E5\u547D\u4EE4: ${command}\uFF08\u53EF\u7528\u547D\u4EE4: list / call\uFF0C--help \u67E5\u770B\u5E2E\u52A9\uFF09`));
    return EXIT_CODES.USAGE;
  }
  if (opts.timeout !== void 0) {
    const t = parseInt(opts.timeout, 10);
    if (!Number.isFinite(t) || t <= 0) {
      printError(makeError("\u53C2\u6570\u9519\u8BEF", `--timeout \u9700\u8981\u6B63\u6574\u6570\u6BEB\u79D2\u503C\uFF0C\u6536\u5230: ${opts.timeout}`));
      return EXIT_CODES.USAGE;
    }
  }
  const cfg = getConfig(opts);
  if (command === "list") {
    if (positional.length > 2) {
      printError(makeError("\u7528\u6CD5\u9519\u8BEF", "list \u547D\u4EE4\u6700\u591A\u63A5\u53D7\u4E00\u4E2A\u5173\u952E\u8BCD\u53C2\u6570"));
      return EXIT_CODES.USAGE;
    }
  } else {
    if (!positional[1]) {
      printError(
        makeError("\u7528\u6CD5\u9519\u8BEF", "call \u547D\u4EE4\u9700\u8981\u5DE5\u5177\u540D\u53C2\u6570: node skill.js call <tool>\uFF08\u5148 list \u67E5\u770B\u53EF\u7528\u5DE5\u5177\uFF09")
      );
      return EXIT_CODES.USAGE;
    }
    if (positional.length > 2) {
      printError(
        makeError(
          "\u7528\u6CD5\u9519\u8BEF",
          `\u591A\u4F59\u53C2\u6570: ${positional.slice(2).join(" ")}\uFF08--arg \u7684\u503C\u542B\u7A7A\u683C\u65F6\u8BF7\u6574\u4F53\u52A0\u5F15\u53F7: --arg "k=v v"\uFF09`
        )
      );
      return EXIT_CODES.USAGE;
    }
  }
  if (!cfg.apiKey) {
    printError(
      makeError(
        "\u7F3A\u5C11 API Key",
        `\u672A\u8BBE\u7F6E MAGPIE_API_KEY\u3002\u8BF7\u5728 ${path.join(__dirname, ".env")} \u4E2D\u914D\u7F6E\uFF08\u53C2\u8003 .env.example\uFF09\uFF0C\u6216\u8BBE\u7F6E\u540C\u540D\u73AF\u5883\u53D8\u91CF\u3002`
      )
    );
    return EXIT_CODES.NO_KEY;
  }
  if (command === "list") return cmdList(opts, positional[1] || "", cfg);
  return cmdCall(opts, positional[1], cfg);
}
main().then((code) => {
  process.exitCode = typeof code === "number" ? code : EXIT_CODES.OK;
}).catch((e) => {
  printError(makeError("\u5185\u90E8\u9519\u8BEF", e && e.message ? e.message : String(e)));
  process.exitCode = EXIT_CODES.API;
});
