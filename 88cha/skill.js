#!/usr/bin/env node
// 88查企业搜索工具 v260512.234051


// run.js
var https = require("https");
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var SKILL_VERSION = true ? "260512.234051" : "1.0.0-dev";
var APP_KEY = "12574478";
var BASE_URL = "https://acs-m.88cha.com/h5";
var COOKIE_FILE = path.join(__dirname, ".cookie");
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
var CH_UA = '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"';
function loadCookie() {
  try {
    return fs.readFileSync(COOKIE_FILE, "utf8").trim();
  } catch {
    return "";
  }
}
function saveCookie(cookie) {
  fs.writeFileSync(COOKIE_FILE, cookie, "utf8");
}
function extractToken(cookie) {
  const match = cookie.match(/_m_h5_tk=([^;]+)/);
  if (!match) return "";
  return match[1].split("_")[0];
}
function generateSign(token, t, appKey, data) {
  const str = `${token}&${t}&${appKey}&${data}`;
  return crypto.createHash("md5").update(str).digest("hex");
}
function generateSpid() {
  return crypto.randomUUID().replace(/-/g, "");
}
function parseArgs() {
  const args = process.argv.slice(2);
  const params = { keyword: "", cookie: "", page: 1, pageSize: 10, raw: false, stream: false };
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--cookie" || args[i] === "-k") && args[i + 1]) {
      params.cookie = args[++i];
    } else if ((args[i] === "--page" || args[i] === "-p") && args[i + 1]) {
      params.page = parseInt(args[++i], 10);
    } else if ((args[i] === "--size" || args[i] === "-s") && args[i + 1]) {
      params.pageSize = parseInt(args[++i], 10);
    } else if (args[i] === "--raw") {
      params.raw = true;
    } else if (args[i] === "--stream" || args[i] === "-S") {
      params.stream = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      printHelp();
      process.exit(0);
    } else if (!args[i].startsWith("-") && !params.keyword) {
      params.keyword = args[i];
    }
  }
  if (!params.cookie && process.env.CHA88_COOKIE) params.cookie = process.env.CHA88_COOKIE;
  if (!params.cookie) params.cookie = loadCookie();
  if (args.some((a, i) => (a === "--cookie" || a === "-k") && args[i + 1])) {
    saveCookie(params.cookie);
  }
  return params;
}
function printHelp() {
  console.log(`88\u67E5\u4F01\u4E1A\u641C\u7D22 v${SKILL_VERSION}

\u7528\u6CD5: node skill.js <\u5173\u952E\u8BCD> [\u9009\u9879]

\u9009\u9879:
  --cookie, -k <string>  88cha.com \u5B8C\u6574 Cookie\uFF08\u9996\u6B21\u4F20\u5165\u540E\u81EA\u52A8\u4FDD\u5B58\uFF09
  --page,   -p <number>  \u9875\u7801\uFF08\u9ED8\u8BA4: 1\uFF09
  --size,   -s <number>  \u6BCF\u9875\u6570\u91CF\uFF08\u9ED8\u8BA4: 10\uFF09
  --stream, -S           \u6DF1\u5EA6\u641C\u7D22\u6A21\u5F0F\uFF08SSE \u6D41\u5F0F\u8FD4\u56DE\uFF09
  --raw                  \u8F93\u51FA\u539F\u59CB JSON
  --help,  -h            \u663E\u793A\u5E2E\u52A9

\u793A\u4F8B:
  node skill.js "\u817E\u8BAF" --cookie "YOUR_COOKIE"     # \u9996\u6B21\u4F7F\u7528\uFF0C\u81EA\u52A8\u4FDD\u5B58 Cookie
  node skill.js "\u963F\u91CC\u5DF4\u5DF4"                         # \u540E\u7EED\u76F4\u63A5\u641C\u7D22
  node skill.js "\u5B57\u8282\u8DF3\u52A8" --page 2                # \u7FFB\u9875
  node skill.js "\u534E\u4E3A" --stream                    # \u6DF1\u5EA6\u641C\u7D22
  node skill.js "\u5C0F\u7C73" --raw                       # \u539F\u59CB JSON \u8F93\u51FA
`);
}
function buildHeaders(cookie, accept) {
  return {
    Accept: accept,
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookie,
    Origin: "https://88cha.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent": UA,
    "sec-ch-ua": CH_UA,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"'
  };
}
function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpGet(res.headers.location, headers));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = "";
      res.setEncoding("utf-8");
      res.on("data", (c) => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}
function httpGetStream(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let buffer = "";
      const events = [];
      res.setEncoding("utf-8");
      res.on("data", (chunk) => {
        buffer += chunk;
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop();
        for (const part of parts) {
          for (const line of part.split("\n")) {
            if (line.startsWith("data:")) {
              try {
                events.push(JSON.parse(line.slice(5).trim()));
              } catch {
              }
            }
          }
        }
      });
      res.on("end", () => {
        if (buffer.trim()) {
          for (const line of buffer.split("\n")) {
            if (line.startsWith("data:")) {
              try {
                events.push(JSON.parse(line.slice(5).trim()));
              } catch {
              }
            }
          }
        }
        resolve(events);
      });
    }).on("error", reject);
  });
}
async function searchCompanies(keyword, cookie, pageNo, pageSize) {
  const token = extractToken(cookie);
  if (!token) throw new Error("Cookie \u4E2D\u672A\u627E\u5230 _m_h5_tk\uFF0C\u8BF7\u63D0\u4F9B\u5B8C\u6574 Cookie");
  const t = Date.now().toString();
  const spid = generateSpid();
  const data = JSON.stringify({ query: keyword, sessionId: "", spid, pageNo, pageSize, scene: "default" });
  const sign = generateSign(token, t, APP_KEY, data);
  const qs = new URLSearchParams({
    jsv: "2.5.8",
    appKey: APP_KEY,
    t,
    sign,
    dangerouslySetWindvaneParams: "[object Object]",
    api: "mtop.com.alibaba.business.query.recommendcompany",
    v: "2.0",
    dataType: "json",
    timeout: "20000",
    type: "originaljson",
    data
  });
  const url = `${BASE_URL}/mtop.com.alibaba.business.query.recommendcompany/2.0/?${qs}`;
  const body = await httpGet(url, buildHeaders(cookie, "application/json"));
  return JSON.parse(body);
}
async function deepSearch(keyword, cookie) {
  const token = extractToken(cookie);
  if (!token) throw new Error("Cookie \u4E2D\u672A\u627E\u5230 _m_h5_tk\uFF0C\u8BF7\u63D0\u4F9B\u5B8C\u6574 Cookie");
  const t = Date.now().toString();
  const spid = generateSpid();
  const data = JSON.stringify({
    action: "first",
    query: keyword,
    enableReasoning: false,
    scene: "default",
    sessionId: "",
    spid,
    target: "search_result_page"
  });
  const sign = generateSign(token, t, APP_KEY, data);
  const qs = new URLSearchParams({
    dataType: "stream",
    method: "get",
    experimental: "[object Object]",
    api: "mtop.com.alibaba.business.query.supersearchreasoning",
    v: "2.0",
    prefix: "acs-m",
    mainDomain: "88cha.com",
    jsv: "0.0.1",
    appKey: APP_KEY,
    t,
    sign,
    xAcceptStream: "true",
    data
  });
  const url = `${BASE_URL}/mtop.com.alibaba.business.query.supersearchreasoning/2.0/?${qs}`;
  return httpGetStream(url, buildHeaders(cookie, "text/event-stream, text/event-stream"));
}
function stripEm(str) {
  return String(str).replace(/<\/?em>/g, "");
}
var DISPLAY_FIELDS = [
  ["legal_name", "\u6CD5\u5B9A\u4EE3\u8868\u4EBA"],
  ["reg_cap", "\u6CE8\u518C\u8D44\u672C"],
  ["es_date", "\u6210\u7ACB\u65E5\u671F"],
  ["ent_status", "\u7ECF\u8425\u72B6\u6001"],
  ["address", "\u6CE8\u518C\u5730\u5740"],
  ["social_credit_code", "\u7EDF\u4E00\u793E\u4F1A\u4FE1\u7528\u4EE3\u7801"],
  ["currencyType", "\u8D27\u5E01\u7C7B\u578B"],
  ["ability_label_outside", "\u80FD\u529B\u6807\u7B7E"]
];
function formatCompany(company, index) {
  const name = stripEm(company.ent_name || company.companyName || "\u672A\u77E5");
  const lines = [`${index}. ${name}`];
  for (const [key, label] of DISPLAY_FIELDS) {
    const val = company[key];
    if (val == null || val === "" || Array.isArray(val) && val.length === 0) continue;
    let display = String(val);
    if (key === "ability_label_outside") {
      display = display.replace(/ZM\$/g, "").replace(/;/g, " | ");
    }
    lines.push(`   ${label}: ${display}`);
  }
  if (company.companyId) lines.push(`   https://88cha.com/company/${company.companyId}`);
  return lines.join("\n");
}
function formatResults(result, keyword, raw) {
  if (raw) return JSON.stringify(result, null, 2);
  if (!result.data) {
    const ret = result.ret || [];
    if (ret.length > 0 && ret[0] !== "SUCCESS::\u8C03\u7528\u6210\u529F") {
      return `API \u9519\u8BEF: ${ret.join(", ")}

\u53EF\u80FD Cookie \u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6\u3002`;
    }
    return `\u641C\u7D22"${keyword}"\u672A\u8FD4\u56DE\u6570\u636E\u3002`;
  }
  const data = result.data;
  const companies = Array.isArray(data.data) ? data.data : Array.isArray(data.resultList) ? data.resultList : Array.isArray(data.companyList) ? data.companyList : [];
  if (companies.length === 0) {
    return `\u641C\u7D22"${keyword}"\u672A\u627E\u5230\u4F01\u4E1A\u3002`;
  }
  const total = data.total || data.totalCount || companies.length;
  let output = `\u641C\u7D22"${keyword}": ${total} \u6761\u7ED3\u679C

`;
  companies.forEach((c, i) => {
    const name = stripEm(c.ent_name || c.companyName || "\u672A\u77E5");
    output += `${i + 1}. ${name}
`;
    if (c.legal_name) output += `   \u6CD5\u4EBA: ${c.legal_name}`;
    if (c.reg_cap) output += ` | \u6CE8\u518C\u8D44\u672C: ${c.reg_cap}`;
    if (c.ent_status) output += ` | \u72B6\u6001: ${c.ent_status}`;
    output += "\n";
    if (c.es_date) output += `   \u6210\u7ACB: ${c.es_date}`;
    if (c.address) output += ` | \u5730\u5740: ${c.address}`;
    output += "\n";
    if (c.social_credit_code) output += `   \u4FE1\u7528\u4EE3\u7801: ${c.social_credit_code}
`;
  });
  return output;
}
function formatStreamResults(events, keyword, raw) {
  if (raw) return JSON.stringify(events, null, 2);
  if (events.length === 0) return `\u6DF1\u5EA6\u641C\u7D22"${keyword}"\u672A\u8FD4\u56DE\u4EFB\u4F55\u6570\u636E\u3002`;
  let summary = "";
  let companies = [];
  for (const evt of events) {
    if (!evt.data) continue;
    let inner;
    try {
      const payload = typeof evt.data === "string" ? JSON.parse(evt.data) : evt.data;
      inner = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;
    } catch {
      continue;
    }
    if (inner.phase === "text" && inner.summary) {
      summary = inner.summary;
    }
    if (inner.companyList || inner.resultList) {
      companies = inner.companyList || inner.resultList;
    }
  }
  let output = `\u6DF1\u5EA6\u641C\u7D22"${keyword}"

`;
  if (summary) {
    output += `## AI \u5206\u6790\u6458\u8981
${summary}

`;
  }
  if (companies.length > 0) {
    output += `## \u76F8\u5173\u4F01\u4E1A (${companies.length} \u6761)
`;
    companies.forEach((c, i) => {
      output += formatCompany(c, i + 1) + "\n\n";
    });
  }
  if (!summary && companies.length === 0) {
    output += `\u672A\u63D0\u53D6\u5230\u6709\u6548\u5185\u5BB9\u3002\u4F7F\u7528 --raw \u67E5\u770B\u539F\u59CB\u6570\u636E\u3002
`;
  }
  return output;
}
async function main() {
  const params = parseArgs();
  if (!params.keyword) {
    console.error("\u9519\u8BEF\uFF1A\u8BF7\u63D0\u4F9B\u641C\u7D22\u5173\u952E\u8BCD");
    console.log("\u7528\u6CD5: node skill.js <\u5173\u952E\u8BCD> --cookie <cookie_string>");
    process.exit(1);
  }
  if (!params.cookie) {
    console.error("\u9519\u8BEF\uFF1A\u8BF7\u63D0\u4F9B Cookie");
    console.log('\u65B9\u5F0F1: node skill.js \u5173\u952E\u8BCD --cookie "YOUR_COOKIE"\uFF08\u9996\u6B21\u4F20\u5165\u540E\u81EA\u52A8\u4FDD\u5B58\uFF09');
    console.log("\u65B9\u5F0F2: \u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF CHA88_COOKIE");
    process.exit(1);
  }
  console.log(`
${"=".repeat(60)}`);
  console.log("88\u67E5\u4F01\u4E1A\u641C\u7D22");
  console.log(`${"=".repeat(60)}
`);
  try {
    if (params.stream) {
      console.log(`\u6DF1\u5EA6\u641C\u7D22: "${params.keyword}"
`);
      const events = await deepSearch(params.keyword, params.cookie);
      console.log(formatStreamResults(events, params.keyword, params.raw));
    } else {
      console.log(`\u4F01\u4E1A\u641C\u7D22: "${params.keyword}" (\u7B2C${params.page}\u9875)
`);
      const result = await searchCompanies(params.keyword, params.cookie, params.page, params.pageSize);
      console.log(formatResults(result, params.keyword, params.raw));
    }
  } catch (e) {
    console.error(`\u641C\u7D22\u5931\u8D25: ${e.message}`);
    if (e.message.includes("_m_h5_tk") || e.message.includes("Cookie")) {
      console.log("\n\u8BF7\u91CD\u65B0\u83B7\u53D6 Cookie\uFF1A");
      console.log("1. \u6253\u5F00 https://88cha.com/");
      console.log("2. \u767B\u5F55\u8D26\u6237");
      console.log("3. F12 \u2192 Network \u2192 \u4EFB\u610F\u8BF7\u6C42 \u2192 Headers \u2192 \u590D\u5236\u5B8C\u6574 Cookie \u503C");
    }
    process.exit(1);
  }
  console.log(`${"=".repeat(60)}`);
  console.log("\u5B8C\u6210\uFF01");
  console.log(`${"=".repeat(60)}
`);
}
main();
