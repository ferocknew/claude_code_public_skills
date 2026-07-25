#!/usr/bin/env node
// Baidu Search 工具 v260725.173204 - 百度千帆 AI 搜索（baidu_search_nodejs）


// run.js
var fs = require("fs");
var path = require("path");
var SKILL_VERSION = true ? "260725.173204" : "1.0.0-dev";
var ENDPOINT = "https://qianfan.baidubce.com/v2/ai_search/web_search";
var DEFAULT_SUMMARY_LENGTH = 1500;
var DEFAULT_TIMEOUT_SEC = 30;
var MAX_ERROR_DETAIL_LEN = 500;
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function shiftDays(n) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + n);
  return formatLocalDate(d);
}
var RANGE_OFFSETS = { pd: 1, pw: 6, pm: 30, py: 364 };
var DATE_RANGE_PATTERN = /^\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2}$/;
function buildSearchFilter(freshness) {
  if (freshness == null) return {};
  const f = String(freshness).trim();
  if (RANGE_OFFSETS[f] !== void 0) {
    const startDate = shiftDays(-RANGE_OFFSETS[f]);
    const endDate = shiftDays(1);
    return { range: { page_time: { gte: startDate, lt: endDate } } };
  }
  const match = f.match(DATE_RANGE_PATTERN);
  if (match) {
    const [start, end] = f.split("to");
    return { range: { page_time: { gte: start, lt: end } } };
  }
  throw new Error(
    `freshness (${f}) \u5FC5\u987B\u4E3A pd\u3001pw\u3001pm\u3001py \u4E4B\u4E00\uFF0C\u6216\u5339\u914D YYYY-MM-DDtoYYYY-MM-DD`
  );
}
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
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  return env;
}
function resolveEnv() {
  const fileEnv = loadEnvFile();
  return {
    BAIDU_API_KEY: process.env.BAIDU_API_KEY || fileEnv.BAIDU_API_KEY || "",
    DUMATE_SESSION_ID: process.env.DUMATE_SESSION_ID || fileEnv.DUMATE_SESSION_ID || "",
    DUMATE_SCHEDULER_URL: process.env.DUMATE_SCHEDULER_URL || fileEnv.DUMATE_SCHEDULER_URL || ""
  };
}
function resolveSandboxUrl(originalUrl, env, apiKeyOverride) {
  const sessionId = env.DUMATE_SESSION_ID;
  const schedulerUrl = env.DUMATE_SCHEDULER_URL;
  const headers = { "Content-Type": "application/json" };
  if (!sessionId || !schedulerUrl) {
    const apiKey = apiKeyOverride || env.BAIDU_API_KEY;
    if (!apiKey) {
      throw new Error(
        "\u672A\u8BBE\u7F6E API Key\uFF0C\u8BF7\u901A\u8FC7\u73AF\u5883\u53D8\u91CF BAIDU_API_KEY\u3001skill \u540C\u76EE\u5F55 .env \u6587\u4EF6\u6216 --api-key \u8BBE\u7F6E"
      );
    }
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["X-Appbuilder-From"] = "openclaw";
    return { url: originalUrl, headers };
  }
  const parsed = new URL(originalUrl);
  let proxyUrl = `${schedulerUrl}/api/qianfanproxy${parsed.pathname}`;
  if (parsed.search) proxyUrl += parsed.search;
  headers["Host"] = parsed.host;
  headers["X-Dumate-Session-Id"] = sessionId;
  headers["X-Appbuilder-From"] = "desktop";
  return { url: proxyUrl, headers };
}
function buildRequestBody({ query, count, freshness }) {
  return {
    messages: [{ content: query, role: "user" }],
    search_source: "baidu_search_v2",
    resource_type_filter: [{ type: "web", top_k: count }],
    search_filter: buildSearchFilter(freshness)
  };
}
function pickSummary(item, maxLen) {
  if (!maxLen || maxLen <= 0) return "";
  let s = item.snippet || item.content || "";
  s = String(s).replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length > maxLen) s = s.slice(0, maxLen) + "\u2026";
  return s;
}
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
function formatText(items) {
  if (!items.length) return "(\u672A\u627E\u5230\u641C\u7D22\u7ED3\u679C)";
  const lines = [`\u627E\u5230 ${items.length} \u6761\u7ED3\u679C\uFF1A`];
  items.forEach((it, i) => {
    lines.push(`[${i + 1}] ${it.title || "(\u65E0\u6807\u9898)"}`);
    if (it.url) lines.push(`    ${it.url}`);
    if (it.summary) lines.push(`    \u6458\u8981: ${it.summary}`);
    const meta = [it.date, it.website].filter(Boolean).join(" \xB7 ");
    if (meta) lines.push(`    ${meta}`);
  });
  return lines.join("\n");
}
async function baiduSearch(requestBody, { apiKeyOverride, env, verbose, timeoutSec }) {
  const { url, headers } = resolveSandboxUrl(ENDPOINT, env, apiKeyOverride);
  if (verbose) {
    console.error(`[debug] POST ${url}`);
    console.error(`[debug] request body: ${JSON.stringify(requestBody)}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    (timeoutSec || DEFAULT_TIMEOUT_SEC) * 1e3
  );
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(`\u8BF7\u6C42\u8D85\u65F6\uFF08${timeoutSec || DEFAULT_TIMEOUT_SEC}s\uFF09`);
    }
    throw new Error(`\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25: ${e.message}`);
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
      } catch (_2) {
      }
    }
    if (detail && detail.length > MAX_ERROR_DETAIL_LEN) {
      detail = detail.slice(0, MAX_ERROR_DETAIL_LEN) + "\u2026";
    }
    throw new Error(
      `HTTP ${response.status} ${response.statusText}${detail ? " - " + detail : ""}`
    );
  }
  const results = await response.json();
  if (results && typeof results === "object" && "code" in results) {
    throw new Error(results.message || JSON.stringify(results));
  }
  return results && results.references || [];
}
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
    version: false
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
        if (typeof arg === "string" && arg.trimStart().startsWith("{")) {
          try {
            opts.jsonBody = JSON.parse(arg);
          } catch (e) {
            throw new Error(`JSON \u89E3\u6790\u5931\u8D25: ${e.message}`);
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
  console.log(`Baidu Search - \u767E\u5EA6\u5343\u5E06 AI \u641C\u7D22 v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js '<JSON>'                          # JSON \u8BF7\u6C42\u4F53\uFF08\u4E0E Python \u7248\u4E00\u81F4\uFF09
  node skill.js --query "\u5173\u952E\u8BCD" [\u9009\u9879]            # \u4FBF\u6377\u53C2\u6570\u6A21\u5F0F
  node skill.js "\u5173\u952E\u8BCD"                          # \u88F8\u5B57\u7B26\u4E32\u5F53\u4F5C query

\u53C2\u6570 (JSON \u6A21\u5F0F\u6216\u4FBF\u6377\u6A21\u5F0F\u5747\u53EF):
  query       \u5FC5\u9700  \u641C\u7D22\u5173\u952E\u8BCD
  count       \u53EF\u9009  \u8FD4\u56DE\u7ED3\u679C\u6570\u91CF\uFF0C\u8303\u56F4 1-50\uFF0C\u9ED8\u8BA4 10
  freshness   \u53EF\u9009  \u65F6\u95F4\u8303\u56F4:
                   - pd/pw/pm/py: \u8FC7\u53BB 24 \u5C0F\u65F6 / 7 \u5929 / 31 \u5929 / 365 \u5929
                   - YYYY-MM-DDtoYYYY-MM-DD: \u6307\u5B9A\u65E5\u671F\u533A\u95F4

\u8F93\u51FA\u9009\u9879 (\u9ED8\u8BA4\u8F93\u51FA\u7CBE\u7B80 text\uFF0C\u4EC5\u542B \u6807\u9898+URL+\u6458\u8981+\u65E5\u671F+\u6765\u6E90):
      --json               \u8F93\u51FA\u7CBE\u7B80 JSON\uFF08\u7F29\u8FDB\uFF09
      --raw                \u7D27\u51D1 JSON\uFF08\u65E0\u7F29\u8FDB\uFF09\uFF0C\u53EF\u4E0E --json / --full \u7EC4\u5408
      --full               \u8F93\u51FA\u5B8C\u6574\u539F\u59CB\u5B57\u6BB5\uFF08JSON\uFF0C\u542B content \u7B49\u5168\u90E8\u5B57\u6BB5\uFF09
      --no-summary         \u4E0D\u8F93\u51FA\u6458\u8981\uFF0C\u4EC5 \u6807\u9898+URL\uFF08\u6700\u7701 token\uFF09
      --summary-length N   \u6458\u8981\u6700\u5927\u5B57\u7B26\u6570\uFF0C\u9ED8\u8BA4 200\uFF080 \u7B49\u540C --no-summary\uFF09

\u901A\u7528\u9009\u9879:
  -q, --query <text>        \u641C\u7D22\u5173\u952E\u8BCD
  -n, --count <int>         \u7ED3\u679C\u6570\u91CF (1-50\uFF0C\u9ED8\u8BA4 10)
  -f, --freshness <value>   \u65F6\u95F4\u8303\u56F4\u8FC7\u6EE4
      --timeout <sec>       \u8BF7\u6C42\u8D85\u65F6\u79D2\u6570\uFF0C\u9ED8\u8BA4 30
      --verbose             \u8F93\u51FA\u8C03\u8BD5\u4FE1\u606F\u5230 stderr
      --api-key <key>       \u4E34\u65F6\u8986\u76D6 BAIDU_API_KEY
  -h, --help                \u663E\u793A\u5E2E\u52A9
  -v, --version             \u663E\u793A\u7248\u672C

\u73AF\u5883\u53D8\u91CF:
  BAIDU_API_KEY             \u767E\u5EA6\u5343\u5E06 API Key\uFF08\u5FC5\u9700\uFF0C\u975E\u6C99\u76D2\u73AF\u5883\uFF09
  DUMATE_SESSION_ID         \u6C99\u76D2\u4F1A\u8BDD ID\uFF08\u6C99\u76D2\u73AF\u5883\uFF09
  DUMATE_SCHEDULER_URL      \u6C99\u76D2\u8C03\u5EA6\u5730\u5740\uFF08\u6C99\u76D2\u73AF\u5883\uFF09
  \u4E5F\u4F1A\u81EA\u52A8\u8BFB\u53D6 skill \u540C\u76EE\u5F55\u7684 .env \u6587\u4EF6

API Key \u83B7\u53D6:
  https://console.bce.baidu.com/ai-search/qianfan/ais/console/apiKey

\u63D0\u793A:
  \u9ED8\u8BA4 text \u8F93\u51FA\u5DF2\u7CBE\u7B80\uFF0C\u5EFA\u8BAE\u62FF\u5230 URL \u540E\u7528 jina-reader \u7B49 url \u5DE5\u5177\u8BFB\u53D6\u5168\u6587\u786E\u8BA4\u3002

\u793A\u4F8B:
  # \u9ED8\u8BA4\u7CBE\u7B80 text
  node skill.js --query "\u4EBA\u5DE5\u667A\u80FD"
  node skill.js '{"query":"\u6700\u65B0\u65B0\u95FB","count":5,"freshness":"pw"}'

  # \u7CBE\u7B80 JSON / \u7D27\u51D1 JSON
  node skill.js -q "\u4EBA\u5DE5\u667A\u80FD" --json
  node skill.js -q "\u4EBA\u5DE5\u667A\u80FD" --raw

  # \u4EC5 URL\uFF08\u6700\u7701 token\uFF09/ \u5B8C\u6574\u539F\u59CB\u5B57\u6BB5
  node skill.js -q "\u4EBA\u5DE5\u667A\u80FD" --no-summary
  node skill.js -q "\u4EBA\u5DE5\u667A\u80FD" --full
`);
}
function renderOutput(datas, opts) {
  if (opts.full) {
    return opts.raw ? JSON.stringify(datas) : JSON.stringify(datas, null, 2);
  }
  const simplified = datas.map((it) => simplifyItem(it, opts));
  if (opts.asJson || opts.raw) {
    return opts.raw ? JSON.stringify(simplified) : JSON.stringify(simplified, null, 2);
  }
  return formatText(simplified);
}
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
  const merged = { ...opts.jsonBody || {} };
  if (opts.query != null) merged.query = opts.query;
  if (opts.count != null) merged.count = opts.count;
  if (opts.freshness != null) merged.freshness = opts.freshness;
  if (merged.query == null || String(merged.query).trim() === "") {
    console.error("Error: \u8BF7\u6C42\u4F53\u4E2D\u5FC5\u987B\u5305\u542B query \u5B57\u6BB5\u3002");
    console.error(`\u7528\u6CD5: node skill.js '{"query":"\u5173\u952E\u8BCD"}' \u6216 node skill.js --query "\u5173\u952E\u8BCD"`);
    process.exit(1);
  }
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
    freshness: merged.freshness
  });
  const env = resolveEnv();
  try {
    const datas = await baiduSearch(requestBody, {
      apiKeyOverride: opts.apiKey,
      env,
      verbose: opts.verbose,
      timeoutSec: opts.timeout
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
