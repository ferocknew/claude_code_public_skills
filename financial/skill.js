#!/usr/bin/env node
// Financial Info API 工具 v260531.122702


// run.js
var fs = require("fs");
var path = require("path");
var SKILL_VERSION = true ? "260531.122702" : "1.0.0-dev";
var COMMANDS = {
  info: { method: "GET", path: () => "/api/v1/mcp" },
  quote: { method: "GET", path: (p) => `/api/v1/mcp/quote/${encodeURIComponent(p.code)}` },
  history: { method: "GET", path: (p) => `/api/v1/mcp/quote/${encodeURIComponent(p.code)}/history`, query: ["limit"] },
  kline: { method: "GET", path: (p) => `/api/v1/mcp/kline/${encodeURIComponent(p.code)}`, query: ["kline_type", "days", "force_sync", "force_refresh"] },
  "sina-futures": { method: "GET", path: (p) => `/api/v1/mcp/sina/futures/${encodeURIComponent(p.symbol)}` },
  "sina-comprehensive": { method: "GET", path: () => "/api/v1/mcp/sina/comprehensive", query: ["symbols"] },
  "sina-codes": { method: "GET", path: () => "/api/v1/mcp/sina/codes" },
  "news-stock": { method: "GET", path: () => "/api/v1/mcp/sina/news/stock", query: ["market", "symbol", "page", "num"] },
  "news-weibo": { method: "GET", path: () => "/api/v1/mcp/sina/news/weibo", query: ["plugin", "num", "ctime", "page_size"] },
  "ths-quote": { method: "GET", path: (p) => `/api/v1/mcp/ths/stock/${encodeURIComponent(p.code)}/quote` },
  "ths-kline": { method: "GET", path: (p) => `/api/v1/mcp/ths/stock/${encodeURIComponent(p.code)}/kline`, query: ["period", "limit"] },
  "ths-timeshare": { method: "GET", path: (p) => `/api/v1/mcp/ths/stock/${encodeURIComponent(p.code)}/timeshare` },
  "ths-news": { method: "GET", path: (p) => `/api/v1/mcp/ths/stock/${encodeURIComponent(p.code)}/news`, query: ["limit"] },
  "ths-announcements": { method: "GET", path: (p) => `/api/v1/mcp/ths/stock/${encodeURIComponent(p.code)}/announcements`, query: ["limit"] },
  "ths-reports": { method: "GET", path: (p) => `/api/v1/mcp/ths/stock/${encodeURIComponent(p.code)}/reports`, query: ["limit"] }
};
var OPTION_ALIASES = {
  type: "kline_type",
  klineType: "kline_type",
  "kline-type": "kline_type",
  forceSync: "force_sync",
  "force-sync": "force_sync",
  forceRefresh: "force_refresh",
  "force-refresh": "force_refresh",
  pageSize: "page_size",
  "page-size": "page_size"
};
function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}
function deriveBaseUrl(env) {
  const configured = env.FINANCIAL_API_BASE_URL || process.env.FINANCIAL_API_BASE_URL || env.FINANCIAL_MCP_URL || process.env.FINANCIAL_MCP_URL || env.url || process.env.url || "http://localhost:8000";
  if (/\/mcp\/?$/i.test(configured)) {
    return configured.replace(/\/mcp\/?$/i, "");
  }
  return configured;
}
function printHelp() {
  console.log(`Financial Info API \u5DE5\u5177 v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <\u547D\u4EE4> [\u53C2\u6570] [\u9009\u9879]

\u73AF\u5883\u53D8\u91CF:
  FINANCIAL_API_BASE_URL   API \u670D\u52A1\u5730\u5740\uFF0C\u9ED8\u8BA4 http://localhost:8000
  FINANCIAL_MCP_URL        MCP \u670D\u52A1\u5730\u5740\uFF1B\u5982\u679C\u4EE5 /mcp \u7ED3\u5C3E\u4F1A\u81EA\u52A8\u63A8\u5BFC API \u6839\u5730\u5740
  FINANCIAL_API_TOKEN      Bearer Token\uFF1B\u672A\u8BBE\u7F6E\u65F6\u8BFB\u53D6 MCP_API_KEY
  FINANCIAL_MCP_TOKEN      MCP Bearer Token
  FINANCIAL_API_TIMEOUT_MS \u8BF7\u6C42\u8D85\u65F6\u65F6\u95F4\uFF0C\u9ED8\u8BA4 30000

\u901A\u7528\u9009\u9879:
  --base-url <url>         \u8986\u76D6 API \u670D\u52A1\u5730\u5740
  --token <token>          \u8986\u76D6 Bearer Token
  --timeout <ms>           \u8986\u76D6\u8BF7\u6C42\u8D85\u65F6\u65F6\u95F4
  --raw                    \u8F93\u51FA\u7D27\u51D1 JSON
  --help, -h               \u663E\u793A\u5E2E\u52A9
  --version, -v            \u663E\u793A\u7248\u672C

\u547D\u4EE4:
  info
  quote <code>
  history <code> [--limit 100]
  kline <code> [--type day] [--days 30] [--force-sync] [--force-refresh]
  sina-futures <symbol>
  sina-comprehensive <symbols>
  sina-codes
  news-stock [--market fx] [--symbol au9999] [--page 1] [--num 10]
  news-weibo [--plugin futures] [--num 20] [--ctime 0] [--page-size 20]
  ths-quote <code>
  ths-kline <code> [--period day] [--limit 100]
  ths-timeshare <code>
  ths-news <code> [--limit 10]
  ths-announcements <code> [--limit 10]
  ths-reports <code> [--limit 10]

\u793A\u4F8B:
  node skill.js info --token "$MCP_API_KEY"
  node skill.js quote AU9999
  node skill.js quote 600519
  node skill.js kline 600519 --type day --days 30
  node skill.js sina-futures GC
  node skill.js sina-comprehensive "hf_GC,sh000001,fx_susdcny"
  node skill.js news-stock --symbol au9999 --num 5
  node skill.js ths-news 300033 --limit 5
`);
}
function normalizeOptionName(name) {
  return OPTION_ALIASES[name] || name.replace(/-/g, "_");
}
function parseArgs(argv) {
  const env = loadEnvFile();
  const params = {
    baseUrl: deriveBaseUrl(env),
    token: env.FINANCIAL_API_TOKEN || process.env.FINANCIAL_API_TOKEN || env.FINANCIAL_MCP_TOKEN || process.env.FINANCIAL_MCP_TOKEN || env.MCP_API_KEY || process.env.MCP_API_KEY || env.token || process.env.token || "",
    timeout: env.FINANCIAL_API_TIMEOUT_MS || process.env.FINANCIAL_API_TIMEOUT_MS || "30000",
    raw: false,
    command: "",
    code: "",
    symbol: "",
    symbols: ""
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      params.help = true;
    } else if (arg === "--version" || arg === "-v") {
      params.version = true;
    } else if (arg === "--raw") {
      params.raw = true;
    } else if (arg === "--base-url" && argv[i + 1]) {
      params.baseUrl = argv[++i];
    } else if (arg === "--token" && argv[i + 1]) {
      params.token = argv[++i];
    } else if (arg === "--timeout" && argv[i + 1]) {
      params.timeout = argv[++i];
    } else if (arg.startsWith("--")) {
      const optionName = normalizeOptionName(arg.slice(2));
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        params[optionName] = true;
      } else {
        params[optionName] = next;
        i += 1;
      }
    } else {
      positional.push(arg);
    }
  }
  params.command = positional[0] || "";
  if (params.command === "sina-futures") {
    params.symbol = positional[1] || params.symbol;
  } else if (params.command === "sina-comprehensive") {
    params.symbols = positional[1] || params.symbols;
  } else {
    params.code = positional[1] || params.code;
  }
  return params;
}
function appendQuery(url, names, params) {
  if (!names || names.length === 0) return;
  for (const name of names) {
    const value = params[name];
    if (value === void 0 || value === "" || value === false) continue;
    url.searchParams.set(name, String(value));
  }
}
function requireValue(params, key, label) {
  if (!params[key]) {
    throw new Error(`\u7F3A\u5C11${label}: ${key}`);
  }
}
function validateParams(params) {
  if (!COMMANDS[params.command]) {
    throw new Error(`\u672A\u77E5\u547D\u4EE4: ${params.command || "(\u7A7A)"}`);
  }
  if (!params.token) {
    throw new Error("\u7F3A\u5C11 Bearer Token\uFF0C\u8BF7\u8BBE\u7F6E FINANCIAL_API_TOKEN \u6216 MCP_API_KEY\uFF0C\u6216\u4F20\u5165 --token");
  }
  if (["quote", "history", "kline", "ths-quote", "ths-kline", "ths-timeshare", "ths-news", "ths-announcements", "ths-reports"].includes(params.command)) {
    requireValue(params, "code", "\u4EE3\u7801\u53C2\u6570");
  }
  if (params.command === "sina-futures") requireValue(params, "symbol", "\u671F\u8D27\u4EE3\u7801");
  if (params.command === "sina-comprehensive") requireValue(params, "symbols", "\u7EFC\u5408\u884C\u60C5\u4EE3\u7801\u5217\u8868");
}
async function request(params) {
  const command = COMMANDS[params.command];
  const baseUrl = params.baseUrl.replace(/\/+$/, "");
  const url = new URL(command.path(params), baseUrl);
  appendQuery(url, command.query, params);
  const timeoutMs = Number.parseInt(params.timeout, 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 3e4);
  let res;
  try {
    res = await fetch(url, {
      method: command.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${params.token}`
      },
      signal: controller.signal
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(`\u8BF7\u6C42\u8D85\u65F6: ${timeoutMs}ms`);
    }
    if (e.cause && e.cause.message) {
      throw new Error(`${e.message}: ${e.cause.message}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail = typeof body === "object" && body ? JSON.stringify(body) : String(body || "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }
  return body;
}
function printResult(data, raw) {
  if (raw) {
    console.log(JSON.stringify(data));
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}
async function main() {
  const params = parseArgs(process.argv.slice(2));
  if (params.version) {
    console.log(`Financial Info API \u5DE5\u5177 v${SKILL_VERSION}`);
    return;
  }
  if (params.help || !params.command) {
    printHelp();
    return;
  }
  validateParams(params);
  const data = await request(params);
  printResult(data, params.raw);
}
main().catch((e) => {
  console.error(`\u8BF7\u6C42\u5931\u8D25: ${e.message}`);
  process.exit(1);
});
