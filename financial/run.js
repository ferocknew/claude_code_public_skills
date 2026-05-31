#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

const COMMANDS = {
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
  "ths-reports": { method: "GET", path: (p) => `/api/v1/mcp/ths/stock/${encodeURIComponent(p.code)}/reports`, query: ["limit"] },
};

const OPTION_ALIASES = {
  type: "kline_type",
  klineType: "kline_type",
  "kline-type": "kline_type",
  forceSync: "force_sync",
  "force-sync": "force_sync",
  forceRefresh: "force_refresh",
  "force-refresh": "force_refresh",
  pageSize: "page_size",
  "page-size": "page_size",
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
  console.log(`Financial Info API 工具 v${SKILL_VERSION}

用法:
  node skill.js <命令> [参数] [选项]

环境变量:
  FINANCIAL_API_BASE_URL   API 服务地址，默认 http://localhost:8000
  FINANCIAL_MCP_URL        MCP 服务地址；如果以 /mcp 结尾会自动推导 API 根地址
  FINANCIAL_API_TOKEN      Bearer Token；未设置时读取 MCP_API_KEY
  FINANCIAL_MCP_TOKEN      MCP Bearer Token
  FINANCIAL_API_TIMEOUT_MS 请求超时时间，默认 30000

通用选项:
  --base-url <url>         覆盖 API 服务地址
  --token <token>          覆盖 Bearer Token
  --timeout <ms>           覆盖请求超时时间
  --raw                    输出紧凑 JSON
  --help, -h               显示帮助
  --version, -v            显示版本

命令:
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

示例:
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
    symbols: "",
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
    if (value === undefined || value === "" || value === false) continue;
    url.searchParams.set(name, String(value));
  }
}

function requireValue(params, key, label) {
  if (!params[key]) {
    throw new Error(`缺少${label}: ${key}`);
  }
}

function validateParams(params) {
  if (!COMMANDS[params.command]) {
    throw new Error(`未知命令: ${params.command || "(空)"}`);
  }
  if (!params.token) {
    throw new Error("缺少 Bearer Token，请设置 FINANCIAL_API_TOKEN 或 MCP_API_KEY，或传入 --token");
  }
  if (["quote", "history", "kline", "ths-quote", "ths-kline", "ths-timeshare", "ths-news", "ths-announcements", "ths-reports"].includes(params.command)) {
    requireValue(params, "code", "代码参数");
  }
  if (params.command === "sina-futures") requireValue(params, "symbol", "期货代码");
  if (params.command === "sina-comprehensive") requireValue(params, "symbols", "综合行情代码列表");
}

async function request(params) {
  const command = COMMANDS[params.command];
  const baseUrl = params.baseUrl.replace(/\/+$/, "");
  const url = new URL(command.path(params), baseUrl);
  appendQuery(url, command.query, params);
  const timeoutMs = Number.parseInt(params.timeout, 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 30000);

  let res;
  try {
    res = await fetch(url, {
      method: command.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${params.token}`,
      },
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(`请求超时: ${timeoutMs}ms`);
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
    console.log(`Financial Info API 工具 v${SKILL_VERSION}`);
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
  console.error(`请求失败: ${e.message}`);
  process.exit(1);
});
