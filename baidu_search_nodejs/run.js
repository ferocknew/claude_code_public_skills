#!/usr/bin/env node
/**
 * Baidu Search - 百度千帆 AI 搜索（baidu_search_nodejs）
 *
 * 用法:
 *   node skill.js '<JSON>'
 *   node skill.js --query "关键词" [--count 20] [--freshness pw]
 *
 * 对应 Python 版 baidu-search 的 Node.js 移植，调用百度千帆 AI 搜索 web_search 接口。
 * 默认输出精简 text（摘要+URL），便于 LLM 再用 url 工具确认全文；--json / --full 可切换。
 */

const fs = require("fs");
const path = require("path");

const SKILL_VERSION =
  typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

const ENDPOINT = "https://qianfan.baidubce.com/v2/ai_search/web_search";

// 默认摘要长度（字符）：保留完整 content 摘要，仅超长（>1500）才截断。
// 百度 content 本身是浓缩摘要（非全文），1500 可覆盖绝大多数，无需二次 curl 即信息完整。
const DEFAULT_SUMMARY_LENGTH = 1500;
const DEFAULT_TIMEOUT_SEC = 30;
// HTTP 错误响应体最大保留长度，避免超长错误信息污染输出
const MAX_ERROR_DETAIL_LEN = 500;

// === 日期工具（使用本地时区，与 Python datetime.now() 行为一致）===

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 返回相对今天偏移 n 天的 YYYY-MM-DD 字符串
function shiftDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatLocalDate(d);
}

// === freshness -> search_filter（与 Python 版偏移量完全一致：pd=1, pw=6, pm=30, py=364 天）===

const RANGE_OFFSETS = { pd: 1, pw: 6, pm: 30, py: 364 };
const DATE_RANGE_PATTERN = /^\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2}$/;

function buildSearchFilter(freshness) {
  if (freshness == null) return {};
  const f = String(freshness).trim();
  if (RANGE_OFFSETS[f] !== undefined) {
    const startDate = shiftDays(-RANGE_OFFSETS[f]);
    const endDate = shiftDays(1); // end = 今天 + 1 天
    return { range: { page_time: { gte: startDate, lt: endDate } } };
  }
  const match = f.match(DATE_RANGE_PATTERN);
  if (match) {
    const [start, end] = f.split("to");
    return { range: { page_time: { gte: start, lt: end } } };
  }
  throw new Error(
    `freshness (${f}) 必须为 pd、pw、pm、py 之一，或匹配 YYYY-MM-DDtoYYYY-MM-DD`
  );
}

// === 读取 skill 同目录 .env（与 financial skill 一致，环境变量优先级更高）===

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  return env;
}

function resolveEnv() {
  const fileEnv = loadEnvFile();
  return {
    BAIDU_API_KEY:
      process.env.BAIDU_API_KEY || fileEnv.BAIDU_API_KEY || "",
    DUMATE_SESSION_ID:
      process.env.DUMATE_SESSION_ID || fileEnv.DUMATE_SESSION_ID || "",
    DUMATE_SCHEDULER_URL:
      process.env.DUMATE_SCHEDULER_URL || fileEnv.DUMATE_SCHEDULER_URL || "",
  };
}

// === sandbox 代理 URL 解析（移植自 Python resolve_sandbox_url）===

function resolveSandboxUrl(originalUrl, env, apiKeyOverride) {
  const sessionId = env.DUMATE_SESSION_ID;
  const schedulerUrl = env.DUMATE_SCHEDULER_URL;
  const headers = { "Content-Type": "application/json" };

  // 非沙盒环境：走 Bearer API Key
  if (!sessionId || !schedulerUrl) {
    const apiKey = apiKeyOverride || env.BAIDU_API_KEY;
    if (!apiKey) {
      throw new Error(
        "未设置 API Key，请通过环境变量 BAIDU_API_KEY、skill 同目录 .env 文件或 --api-key 设置"
      );
    }
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["X-Appbuilder-From"] = "openclaw";
    return { url: originalUrl, headers };
  }

  // 沙盒环境：替换为代理 URL
  const parsed = new URL(originalUrl);
  let proxyUrl = `${schedulerUrl}/api/qianfanproxy${parsed.pathname}`;
  if (parsed.search) proxyUrl += parsed.search;
  headers["Host"] = parsed.host;
  headers["X-Dumate-Session-Id"] = sessionId;
  headers["X-Appbuilder-From"] = "desktop";
  return { url: proxyUrl, headers };
}

// === 构造请求体（与 Python 版结构完全一致）===

function buildRequestBody({ query, count, freshness }) {
  return {
    messages: [{ content: query, role: "user" }],
    search_source: "baidu_search_v2",
    resource_type_filter: [{ type: "web", top_k: count }],
    search_filter: buildSearchFilter(freshness),
  };
}

// === 摘要与字段精简 ===

// 从原始条目提取摘要：优先 snippet，回退 content；折叠空白并按长度截断
function pickSummary(item, maxLen) {
  if (!maxLen || maxLen <= 0) return "";
  let s = item.snippet || item.content || "";
  s = String(s).replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length > maxLen) s = s.slice(0, maxLen) + "…";
  return s;
}

// 精简为 LLM 友好字段：title / url / summary / date / website（省略空字段）
function simplifyItem(item, opts) {
  const out = {};
  if (item.title) out.title = item.title;
  if (item.url) out.url = item.url;
  if (!opts.noSummary) {
    const summary = pickSummary(item, opts.summaryLength);
    if (summary) out.summary = summary;
  }
  if (item.date) out.date = item.date;
  if (item.website) out.website = item.website;
  return out;
}

// text 格式：紧凑可读，URL 单独成行便于 LLM 提取
function formatText(items) {
  if (!items.length) return "(未找到搜索结果)";
  const lines = [`找到 ${items.length} 条结果：`];
  items.forEach((it, i) => {
    lines.push(`[${i + 1}] ${it.title || "(无标题)"}`);
    if (it.url) lines.push(`    ${it.url}`);
    if (it.summary) lines.push(`    摘要: ${it.summary}`);
    const meta = [it.date, it.website].filter(Boolean).join(" · ");
    if (meta) lines.push(`    ${meta}`);
  });
  return lines.join("\n");
}

// === 核心搜索调用 ===

async function baiduSearch(requestBody, { apiKeyOverride, env, verbose, timeoutSec }) {
  const { url, headers } = resolveSandboxUrl(ENDPOINT, env, apiKeyOverride);
  if (verbose) {
    console.error(`[debug] POST ${url}`);
    console.error(`[debug] request body: ${JSON.stringify(requestBody)}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    (timeoutSec || DEFAULT_TIMEOUT_SEC) * 1000
  );

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(`请求超时（${timeoutSec || DEFAULT_TIMEOUT_SEC}s）`);
    }
    throw new Error(`网络请求失败: ${e.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await response.json());
    } catch (_) {
      try {
        detail = await response.text();
      } catch (_) {}
    }
    if (detail && detail.length > MAX_ERROR_DETAIL_LEN) {
      detail = detail.slice(0, MAX_ERROR_DETAIL_LEN) + "…";
    }
    throw new Error(
      `HTTP ${response.status} ${response.statusText}${detail ? " - " + detail : ""}`
    );
  }

  const results = await response.json();
  if (results && typeof results === "object" && "code" in results) {
    throw new Error(results.message || JSON.stringify(results));
  }

  // 返回原始 references，字段精简交由外层处理
  return (results && results.references) || [];
}

// === CLI 参数解析 ===

function parseArgs(argv) {
  const opts = {
    jsonBody: null,
    query: null,
    count: null,
    freshness: null,
    // 输出控制
    asJson: false,
    raw: false,
    full: false,
    noSummary: false,
    summaryLength: DEFAULT_SUMMARY_LENGTH,
    // 其他
    verbose: false,
    timeout: DEFAULT_TIMEOUT_SEC,
    apiKey: null,
    help: false,
    version: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        opts.help = true;
        i++;
        break;
      case "-v":
      case "--version":
        opts.version = true;
        i++;
        break;
      case "--json":
        opts.asJson = true;
        i++;
        break;
      case "--raw":
        opts.raw = true;
        i++;
        break;
      case "--full":
        opts.full = true;
        i++;
        break;
      case "--no-summary":
        opts.noSummary = true;
        i++;
        break;
      case "--verbose":
        opts.verbose = true;
        i++;
        break;
      case "--summary-length":
        opts.summaryLength = parseInt(argv[++i], 10);
        i++;
        break;
      case "--timeout":
        opts.timeout = parseInt(argv[++i], 10);
        i++;
        break;
      case "-q":
      case "--query":
        opts.query = argv[++i];
        i++;
        break;
      case "-n":
      case "--count":
        opts.count = argv[++i];
        i++;
        break;
      case "-f":
      case "--freshness":
        opts.freshness = argv[++i];
        i++;
        break;
      case "--api-key":
        opts.apiKey = argv[++i];
        i++;
        break;
      default:
        // 非选项参数：以 { 开头视为 JSON 请求体，否则当作裸 query 字符串
        if (typeof arg === "string" && arg.trimStart().startsWith("{")) {
          try {
            opts.jsonBody = JSON.parse(arg);
          } catch (e) {
            throw new Error(`JSON 解析失败: ${e.message}`);
          }
        } else if (opts.query === null) {
          opts.query = arg;
        }
        i++;
        break;
    }
  }

  if (isNaN(opts.summaryLength)) opts.summaryLength = DEFAULT_SUMMARY_LENGTH;
  if (isNaN(opts.timeout) || opts.timeout <= 0) opts.timeout = DEFAULT_TIMEOUT_SEC;

  return opts;
}

function printHelp() {
  console.log(`Baidu Search - 百度千帆 AI 搜索 v${SKILL_VERSION}

用法:
  node skill.js '<JSON>'                          # JSON 请求体（与 Python 版一致）
  node skill.js --query "关键词" [选项]            # 便捷参数模式
  node skill.js "关键词"                          # 裸字符串当作 query

参数 (JSON 模式或便捷模式均可):
  query       必需  搜索关键词
  count       可选  返回结果数量，范围 1-50，默认 10
  freshness   可选  时间范围:
                   - pd/pw/pm/py: 过去 24 小时 / 7 天 / 31 天 / 365 天
                   - YYYY-MM-DDtoYYYY-MM-DD: 指定日期区间

输出选项 (默认输出精简 text，仅含 标题+URL+摘要+日期+来源):
      --json               输出精简 JSON（缩进）
      --raw                紧凑 JSON（无缩进），可与 --json / --full 组合
      --full               输出完整原始字段（JSON，含 content 等全部字段）
      --no-summary         不输出摘要，仅 标题+URL（最省 token）
      --summary-length N   摘要最大字符数，默认 200（0 等同 --no-summary）

通用选项:
  -q, --query <text>        搜索关键词
  -n, --count <int>         结果数量 (1-50，默认 10)
  -f, --freshness <value>   时间范围过滤
      --timeout <sec>       请求超时秒数，默认 30
      --verbose             输出调试信息到 stderr
      --api-key <key>       临时覆盖 BAIDU_API_KEY
  -h, --help                显示帮助
  -v, --version             显示版本

环境变量:
  BAIDU_API_KEY             百度千帆 API Key（必需，非沙盒环境）
  DUMATE_SESSION_ID         沙盒会话 ID（沙盒环境）
  DUMATE_SCHEDULER_URL      沙盒调度地址（沙盒环境）
  也会自动读取 skill 同目录的 .env 文件

API Key 获取:
  https://console.bce.baidu.com/ai-search/qianfan/ais/console/apiKey

提示:
  默认 text 输出已精简，建议拿到 URL 后用 jina-reader 等 url 工具读取全文确认。

示例:
  # 默认精简 text
  node skill.js --query "人工智能"
  node skill.js '{"query":"最新新闻","count":5,"freshness":"pw"}'

  # 精简 JSON / 紧凑 JSON
  node skill.js -q "人工智能" --json
  node skill.js -q "人工智能" --raw

  # 仅 URL（最省 token）/ 完整原始字段
  node skill.js -q "人工智能" --no-summary
  node skill.js -q "人工智能" --full
`);
}

// === 输出格式化 ===

function renderOutput(datas, opts) {
  // --full：完整原始字段（JSON）
  if (opts.full) {
    return opts.raw
      ? JSON.stringify(datas)
      : JSON.stringify(datas, null, 2);
  }

  const simplified = datas.map((it) => simplifyItem(it, opts));

  // --json 或 --raw：精简 JSON
  if (opts.asJson || opts.raw) {
    return opts.raw
      ? JSON.stringify(simplified)
      : JSON.stringify(simplified, null, 2);
  }

  // 默认：精简 text
  return formatText(simplified);
}

// === main ===

async function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    printHelp();
    process.exit(0);
  }

  const opts = parseArgs(argv);

  if (opts.help) {
    printHelp();
    process.exit(0);
  }
  if (opts.version) {
    console.log(`baidu-search-nodejs v${SKILL_VERSION}`);
    process.exit(0);
  }

  // 合并参数：便捷参数覆盖 JSON body 中的同名字段
  const merged = { ...(opts.jsonBody || {}) };
  if (opts.query != null) merged.query = opts.query;
  if (opts.count != null) merged.count = opts.count;
  if (opts.freshness != null) merged.freshness = opts.freshness;

  if (merged.query == null || String(merged.query).trim() === "") {
    console.error("Error: 请求体中必须包含 query 字段。");
    console.error("用法: node skill.js '{\"query\":\"关键词\"}' 或 node skill.js --query \"关键词\"");
    process.exit(1);
  }

  // count 边界处理（与 Python 版一致：<=0 -> 10，>50 -> 50）
  let count = 10;
  if (merged.count != null) {
    const n = parseInt(merged.count, 10);
    if (!isNaN(n)) {
      count = n <= 0 ? 10 : n > 50 ? 50 : n;
    }
  }

  let searchFilter;
  try {
    searchFilter = buildSearchFilter(merged.freshness);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

  const requestBody = buildRequestBody({
    query: merged.query,
    count,
    freshness: merged.freshness,
  });

  const env = resolveEnv();
  try {
    const datas = await baiduSearch(requestBody, {
      apiKeyOverride: opts.apiKey,
      env,
      verbose: opts.verbose,
      timeoutSec: opts.timeout,
    });
    console.log(renderOutput(datas, opts));
  } catch (e) {
    console.error(`Error: ${e.message || e}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message || err}`);
  process.exit(1);
});
