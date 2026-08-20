#!/usr/bin/env node
// Xiaomi MiMo Usage Skill v260820.233037

// run.js
var fs = require("fs");
var path = require("path");
var VERSION = true ? "260820.233037" : process.env.SKILL_VERSION || "dev";
var BASE = "https://platform.xiaomimimo.com";
var BROWSER_HEADERS = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  "content-type": "application/json",
  "pragma": "no-cache",
  "priority": "u=1, i",
  "referer": "https://platform.xiaomimimo.com/console/plan-manage",
  "sec-ch-ua": '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  "x-timezone": "Asia/Shanghai"
};
function loadDotEnv() {
  const envFile = path.join(__dirname, ".env");
  if (!fs.existsSync(envFile))
    return;
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#"))
      continue;
    const idx = s.indexOf("=");
    if (idx === -1)
      continue;
    const key = s.slice(0, idx).trim();
    const val = s.slice(idx + 1).trim();
    if (process.env[key] === void 0)
      process.env[key] = val;
  }
}
loadDotEnv();
var args = process.argv.slice(2);
function getArg(name, aliases = []) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name || aliases.includes(args[i]))
      return args[i + 1];
  }
  return null;
}
var opts = {
  help: args.includes("--help") || args.includes("-h"),
  version: args.includes("--version") || args.includes("-v"),
  json: args.includes("--json"),
  cookie: getArg("--cookie") || process.env.XIAOMI_MIMO_COOKIE || null
};
async function fetchUsage(retries = 3) {
  const url = `${BASE}/api/v1/tokenPlan/usage`;
  const headers = { ...BROWSER_HEADERS, "cookie": opts.cookie };
  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers, redirect: "manual" });
      const body = await res.text();
      if (res.status < 500)
        return { status: res.status, body };
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries - 1)
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw lastErr;
}
function parseResult(json) {
  if (json.code !== 0) {
    throw new Error(`\u63A5\u53E3\u8FD4\u56DE\u9519\u8BEF: code=${json.code} message=${json.message || ""}`);
  }
  const data = json.data || {};
  const monthUsage = data.monthUsage || {};
  const usage = data.usage || {};
  const toItem = (items, name) => (items || []).find((i) => i.name === name) || null;
  return {
    month: toItem(monthUsage.items, "month_total_token"),
    plan: toItem(usage.items, "plan_total_token"),
    compensation: toItem(usage.items, "compensation_total_token")
  };
}
function fmtTokens(n) {
  if (n >= 1e9)
    return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)
    return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3)
    return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
function fmtPercent(p) {
  return (p * 100).toFixed(2) + "%";
}
var isTTY = !!process.stdout.isTTY;
var c = {
  green: (s) => isTTY ? `\x1B[32m${s}\x1B[0m` : s,
  yellow: (s) => isTTY ? `\x1B[33m${s}\x1B[0m` : s,
  red: (s) => isTTY ? `\x1B[31m${s}\x1B[0m` : s,
  cyan: (s) => isTTY ? `\x1B[36m${s}\x1B[0m` : s,
  bold: (s) => isTTY ? `\x1B[1m${s}\x1B[0m` : s
};
function pctColor(p) {
  return p >= 0.8 ? c.red(fmtPercent(p)) : p >= 0.5 ? c.yellow(fmtPercent(p)) : c.green(fmtPercent(p));
}
function usageLine(label, item) {
  if (!item)
    return `  ${label.padEnd(6)} ${c.yellow("\u65E0\u6570\u636E")}`;
  const used = fmtTokens(item.used);
  const limit = fmtTokens(item.limit);
  return `  ${label.padEnd(6)} ${pctColor(item.percent).padEnd(9)} \u4F7F\u7528 ${used} / ${limit} tokens`;
}
function printUsage(result) {
  console.log(`
${c.bold("\u5C0F\u7C73 MiMo CodingPlan \u7528\u91CF")}
`);
  console.log(usageLine("\u672C\u6708\u7528\u91CF", result.month));
  console.log(usageLine("\u8BA1\u5212\u603B\u91CF", result.plan));
  console.log(usageLine("\u8865\u507F\u989D\u5EA6", result.compensation));
  console.log("");
}
function showHelp() {
  console.log(`
\u5C0F\u7C73 MiMo CodingPlan \u7528\u91CF\u67E5\u8BE2\u5DE5\u5177 v${VERSION}

\u539F\u7406: GET /api/v1/tokenPlan/usage\uFF08\u5C0F\u7C73\u5F00\u653E\u5E73\u53F0 REST API\uFF09\uFF0C\u5E26\u6D4F\u89C8\u5668 cookie \u5B9E\u65F6\u8FD4\u56DE\u3002

\u4F7F\u7528\u65B9\u6CD5:
  node skill.js                      \u67E5\u8BE2\u7528\u91CF
  node skill.js --json               JSON \u8F93\u51FA\uFF08\u9002\u5408\u811A\u672C\uFF09
  node skill.js --cookie '<v>'      \u4E34\u65F6\u6307\u5B9A cookie
  node skill.js --help               \u663E\u793A\u5E2E\u52A9
  node skill.js --version            \u663E\u793A\u7248\u672C

\u9009\u9879:
  --cookie <v>    \u6D4F\u89C8\u5668 platform.xiaomimimo.com \u7684\u5B8C\u6574 cookie\uFF08\u73AF\u5883\u53D8\u91CF XIAOMI_MIMO_COOKIE\uFF09
  --json          \u8F93\u51FA JSON

\u793A\u4F8B:
  node skill.js
  node skill.js --json

cookie \u83B7\u53D6: \u6D4F\u89C8\u5668\u767B\u5F55 https://platform.xiaomimimo.com \u2192 F12 \u2192 Network \u2192
\u5237\u65B0\u9875\u9762 \u2192 \u4EFB\u9009\u8BF7\u6C42 \u2192 Request Headers \u2192 \u590D\u5236\u6574\u4E2A "cookie:" \u7684\u503C\uFF0C
\u5B58\u5165 XIAOMI_MIMO_COOKIE \u6216\u540C\u76EE\u5F55 .env\uFF08\u53C2\u8003 .env.example\uFF0C.env \u5DF2\u88AB gitignore\uFF09\u3002

\u7F51\u7EDC\u8BF4\u660E: \u4F7F\u7528 Node \u539F\u751F fetch \u76F4\u8FDE\uFF08\u4E0D\u8D70\u7CFB\u7EDF\u4EE3\u7406\uFF09\u3002\u82E5\u9700\u4EE3\u7406\u8BF7\u7528 TUN/\u900F\u660E\u4EE3\u7406\u6A21\u5F0F\u3002
`);
}
function fail(msg, hint) {
  console.error(`
\u274C ${msg}`);
  if (hint)
    console.error(hint);
  if (opts.json) {
    console.error(JSON.stringify({ error: msg }));
  }
  process.exit(1);
}
async function main() {
  if (opts.help) {
    showHelp();
    return;
  }
  if (opts.version) {
    console.log(`xiaomi-mimo-query v${VERSION}`);
    return;
  }
  if (!opts.cookie) {
    fail("\u7F3A\u5C11 cookie\u3002", "\u8BF7\u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF XIAOMI_MIMO_COOKIE \u6216\u540C\u76EE\u5F55 .env\uFF08\u53C2\u8003 .env.example\uFF09\uFF0C\u6216\u52A0 --cookie \u53C2\u6570\u3002");
  }
  let resp;
  try {
    resp = await fetchUsage();
  } catch (e) {
    fail(`\u8BF7\u6C42\u5931\u8D25: ${e.message}`, "\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u901A\u6027\uFF08fetch \u76F4\u8FDE\uFF0C\u4E0D\u8D70\u7CFB\u7EDF\u4EE3\u7406\uFF09\u3002");
  }
  if (resp.status === 401 || resp.status === 403) {
    fail(`\u8BA4\u8BC1\u5931\u8D25\uFF08HTTP ${resp.status}\uFF09\u3002`, "cookie \u53EF\u80FD\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u4ECE\u6D4F\u89C8\u5668\u83B7\u53D6\u3002");
  }
  if (resp.status !== 200) {
    fail(`\u8BF7\u6C42\u5931\u8D25: HTTP ${resp.status}`);
  }
  let result;
  try {
    result = parseResult(JSON.parse(resp.body));
  } catch (e) {
    fail(`\u89E3\u6790\u5931\u8D25: ${e.message}`, "\u63A5\u53E3\u8FD4\u56DE\u7ED3\u6784\u53EF\u80FD\u5DF2\u53D8\u5316\u3002");
  }
  if (opts.json) {
    console.log(JSON.stringify({
      month: result.month,
      plan: result.plan,
      compensation: result.compensation,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, null, 2));
    return;
  }
  printUsage(result);
}
main().catch((e) => {
  console.error(`
\u274C \u9519\u8BEF: ${e.message}`);
  process.exit(1);
});
