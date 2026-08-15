#!/usr/bin/env node
// OpenCode Go Usage Skill v260815.134730

// run.js
var fs = require("fs");
var path = require("path");
var VERSION = true ? "260815.134730" : process.env.SKILL_VERSION || "dev";
var BASE = "https://opencode.ai";
var BROWSER_HEADERS = {
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  "pragma": "no-cache",
  "priority": "u=0, i",
  "sec-ch-ua": '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
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
  list: args.includes("--list"),
  cookie: getArg("--cookie") || process.env.OPENCODE_AUTH || null,
  workspace: getArg("--workspace", ["-w"]) || process.env.OPENCODE_WORKSPACE_ID || null
};
async function fetchPage(urlStr, retries = 3) {
  const headers = { ...BROWSER_HEADERS, "cookie": `oc_locale=zh; auth=${opts.cookie}` };
  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(urlStr, { headers, redirect: "manual" });
      if (res.status < 500) {
        const body = await res.text();
        return { status: res.status, location: res.headers.get("location") || "", body };
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries - 1)
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw lastErr;
}
function parseUsage(html) {
  const re = /(rolling|weekly|monthly)Usage:\$R\[\d+\]=\{status:"(\w+)",resetInSec:(\d+),usagePercent:(\d+)\}/g;
  const out = {};
  let m;
  while ((m = re.exec(html)) !== null) {
    out[m[1]] = { status: m[2], resetInSec: Number(m[3]), usagePercent: Number(m[4]) };
  }
  return out;
}
function parseWorkspaces(html) {
  const re = /\{id:"(wrk_[^"]+)",name:"([^"]*)",slug:null\}/g;
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push({ id: m[1], name: m[2] });
    }
  }
  return out;
}
function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor(sec % 86400 / 3600);
  const mi = Math.floor(sec % 3600 / 60);
  if (d > 0)
    return `${d}\u5929 ${h}\u5C0F\u65F6`;
  if (h > 0)
    return `${h}\u5C0F\u65F6 ${mi}\u5206\u949F`;
  return `${mi}\u5206\u949F`;
}
function fmtResetTime(resetInSec) {
  return new Date(Date.now() + resetInSec * 1e3).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
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
  return p >= 80 ? c.red(p + "%") : p >= 50 ? c.yellow(p + "%") : c.green(p + "%");
}
function printUsage(usage, wsName, wsId) {
  const labels = { rolling: "\u6EDA\u52A8\u7528\u91CF", weekly: "\u6BCF\u5468\u7528\u91CF", monthly: "\u6BCF\u6708\u7528\u91CF" };
  console.log(`
${c.bold("OpenCode Go \u7528\u91CF")}  workspace: ${c.cyan(wsName)} (${wsId})
`);
  for (const key of ["rolling", "weekly", "monthly"]) {
    const u = usage[key];
    if (!u)
      continue;
    console.log(`  ${labels[key].padEnd(8)} ${String(pctColor(u.usagePercent)).padEnd(8)} \u91CD\u7F6E\u5269 ${fmtDuration(u.resetInSec)}\uFF08${fmtResetTime(u.resetInSec)}\uFF09`);
  }
  console.log("");
}
function printWorkspaces(wsList) {
  if (wsList.length === 0) {
    console.log("\u672A\u627E\u5230 workspace \u5217\u8868");
    return;
  }
  console.log(`
${c.bold("Workspace \u5217\u8868")} (${wsList.length} \u4E2A):
`);
  for (const w of wsList) {
    console.log(`  ${c.cyan(w.id)}  ${w.name || "(\u672A\u547D\u540D)"}`);
  }
  console.log("");
}
function showHelp() {
  console.log(`
OpenCode Go \u8BA2\u9605\u7528\u91CF\u67E5\u8BE2\u5DE5\u5177 v${VERSION}

\u539F\u7406: GET /workspace/<id>/go \u9875\u9762\uFF08SolidStart SSR\uFF09\uFF0C\u7528\u91CF\u5185\u5D4C\u5728 HTML \u4E2D\u5B9E\u65F6\u8FD4\u56DE\u3002

\u4F7F\u7528\u65B9\u6CD5:
  node skill.js                      \u67E5\u8BE2\u5F53\u524D workspace \u7528\u91CF
  node skill.js --workspace <id>     \u6307\u5B9A workspace \u67E5\u8BE2
  node skill.js --list               \u5217\u51FA\u8D26\u53F7\u4E0B\u6240\u6709 workspace
  node skill.js --json               \u8F93\u51FA JSON\uFF08\u9002\u5408\u811A\u672C/statusline\uFF09
  node skill.js --help               \u663E\u793A\u5E2E\u52A9
  node skill.js --version            \u663E\u793A\u7248\u672C

\u9009\u9879:
  --workspace, -w <id>    workspace id\uFF08\u73AF\u5883\u53D8\u91CF OPENCODE_WORKSPACE_ID\uFF09
  --cookie <v>            opencode.ai \u7684 auth cookie\uFF08\u73AF\u5883\u53D8\u91CF OPENCODE_AUTH\uFF09
  --json                  \u8F93\u51FA JSON
  --list                  \u5217\u51FA\u6240\u6709 workspace

\u793A\u4F8B:
  node skill.js
  node skill.js --workspace wrk_xxxxxxxx --json

auth cookie \u83B7\u53D6: \u6D4F\u89C8\u5668\u767B\u5F55 https://opencode.ai \u2192 F12 \u2192 Application \u2192 Cookies \u2192
opencode.ai \u2192 \u590D\u5236 "auth" \u7684\u503C\uFF0C\u5B58\u5165 OPENCODE_AUTH \u6216 .env\u3002

\u7F51\u7EDC\u8BF4\u660E: \u4F7F\u7528 Node \u539F\u751F fetch \u76F4\u8FDE\uFF08\u4E0D\u8D70\u7CFB\u7EDF\u4EE3\u7406\uFF09\u3002\u82E5\u9700\u4EE3\u7406\u8BF7\u7528 TUN/\u900F\u660E\u4EE3\u7406\u6A21\u5F0F\u3002
`);
}
function fail(msg, hint) {
  console.error(`
${c.red("\u274C " + msg)}`);
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
    console.log(`opencode-go-usage v${VERSION}`);
    return;
  }
  if (!opts.cookie) {
    fail("\u7F3A\u5C11 auth cookie\u3002", "\u8BF7\u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF OPENCODE_AUTH \u6216\u540C\u76EE\u5F55 .env\uFF08\u53C2\u8003 .env.example\uFF09\uFF0C\u6216\u52A0 --cookie \u53C2\u6570\u3002");
  }
  if (!opts.workspace) {
    fail("\u7F3A\u5C11 workspace id\u3002", "\u8BF7\u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF OPENCODE_WORKSPACE_ID\uFF08\u53C2\u8003 .env.example\uFF09\uFF0C\u6216\u7528 --workspace <id> \u6307\u5B9A\u3002");
  }
  const url = `${BASE}/workspace/${opts.workspace}/go`;
  let resp;
  try {
    resp = await fetchPage(url);
  } catch (e) {
    fail(`\u8BF7\u6C42\u5931\u8D25: ${e.message}`, "\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u901A\u6027\uFF08fetch \u76F4\u8FDE\uFF0C\u4E0D\u8D70\u7CFB\u7EDF\u4EE3\u7406\uFF09\u3002");
  }
  if (resp.status === 302 || resp.status === 401 || resp.status === 403) {
    fail(`\u8BA4\u8BC1\u5931\u8D25\uFF08HTTP ${resp.status}\uFF0C\u8DF3\u8F6C ${resp.location || "\u767B\u5F55\u9875"}\uFF09\u3002`, "auth cookie \u53EF\u80FD\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u4ECE\u6D4F\u89C8\u5668\u83B7\u53D6\u3002");
  }
  if (resp.status !== 200) {
    fail(`\u8BF7\u6C42\u5931\u8D25: HTTP ${resp.status}`);
  }
  const usage = parseUsage(resp.body);
  if (Object.keys(usage).length === 0) {
    fail("\u672A\u80FD\u4ECE\u9875\u9762\u89E3\u6790\u5230\u7528\u91CF\u6570\u636E\uFF08\u9875\u9762\u7ED3\u6784\u53EF\u80FD\u5DF2\u53D8\u5316\uFF09\u3002");
  }
  const wsList = parseWorkspaces(resp.body);
  const wsName = (wsList.find((w) => w.id === opts.workspace) || {}).name || opts.workspace;
  if (opts.list) {
    printWorkspaces(wsList);
    return;
  }
  if (opts.json) {
    console.log(JSON.stringify({
      workspace: { id: opts.workspace, name: wsName },
      rolling: usage.rolling || null,
      weekly: usage.weekly || null,
      monthly: usage.monthly || null,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, null, 2));
    return;
  }
  printUsage(usage, wsName, opts.workspace);
}
main().catch((e) => {
  console.error(`
\u274C \u9519\u8BEF: ${e.message}`);
  process.exit(1);
});
