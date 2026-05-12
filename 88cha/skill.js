#!/usr/bin/env node
// 88查企业搜索工具 v260512.233627


// run.js
var https = require("https");
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var SKILL_VERSION = true ? "260512.233627" : "1.0.0-dev";
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
var FIELD_LABELS = {
  companyName: "\u4F01\u4E1A\u540D\u79F0",
  name: "\u4F01\u4E1A\u540D\u79F0",
  title: "\u4F01\u4E1A\u540D\u79F0",
  legalPerson: "\u6CD5\u5B9A\u4EE3\u8868\u4EBA",
  legalPersonName: "\u6CD5\u5B9A\u4EE3\u8868\u4EBA",
  operName: "\u6CD5\u5B9A\u4EE3\u8868\u4EBA",
  regCapital: "\u6CE8\u518C\u8D44\u672C",
  registeredCapital: "\u6CE8\u518C\u8D44\u672C",
  capital: "\u6CE8\u518C\u8D44\u672C",
  establishDate: "\u6210\u7ACB\u65E5\u671F",
  establisheDate: "\u6210\u7ACB\u65E5\u671F",
  startDate: "\u6210\u7ACB\u65E5\u671F",
  foundDate: "\u6210\u7ACB\u65E5\u671F",
  businessScope: "\u7ECF\u8425\u8303\u56F4",
  scope: "\u7ECF\u8425\u8303\u56F4",
  regAddress: "\u6CE8\u518C\u5730\u5740",
  address: "\u6CE8\u518C\u5730\u5740",
  companyStatus: "\u7ECF\u8425\u72B6\u6001",
  status: "\u7ECF\u8425\u72B6\u6001",
  operatingStatus: "\u7ECF\u8425\u72B6\u6001",
  socialCreditCode: "\u7EDF\u4E00\u793E\u4F1A\u4FE1\u7528\u4EE3\u7801",
  creditCode: "\u7EDF\u4E00\u793E\u4F1A\u4FE1\u7528\u4EE3\u7801",
  companyType: "\u4F01\u4E1A\u7C7B\u578B",
  econType: "\u4F01\u4E1A\u7C7B\u578B",
  type: "\u4F01\u4E1A\u7C7B\u578B",
  industry: "\u884C\u4E1A",
  phone: "\u7535\u8BDD",
  telephone: "\u7535\u8BDD",
  email: "\u90AE\u7BB1",
  regNumber: "\u6CE8\u518C\u53F7",
  orgCode: "\u7EC4\u7EC7\u673A\u6784\u4EE3\u7801",
  province: "\u7701\u4EFD",
  city: "\u57CE\u5E02",
  district: "\u533A\u53BF",
  pid: "\u4F01\u4E1AID",
  id: "ID"
};
function formatCompany(company, index) {
  const lines = [];
  const name = company.companyName || company.name || company.title || "\u672A\u77E5";
  lines.push(`${index}. ${name}`);
  const shown = /* @__PURE__ */ new Set(["companyName", "name", "title"]);
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    if (shown.has(key)) continue;
    const val = company[key];
    if (val == null || val === "" || val === void 0) continue;
    let display = String(val);
    if (key === "businessScope" || key === "scope") display = display.substring(0, 120) + (display.length > 120 ? "..." : "");
    lines.push(`   ${label}: ${display}`);
    shown.add(key);
  }
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
  let companies = [];
  if (Array.isArray(data.resultList)) companies = data.resultList;
  else if (Array.isArray(data.companyList)) companies = data.companyList;
  else if (data.data && Array.isArray(data.data)) companies = data.data;
  else if (data.result && Array.isArray(data.result)) companies = data.result;
  else if (data.list && Array.isArray(data.list)) companies = data.list;
  else if (data.items && Array.isArray(data.items)) companies = data.items;
  if (companies.length === 0) {
    return `\u641C\u7D22"${keyword}" - \u670D\u52A1\u5668\u8FD4\u56DE\u6570\u636E\u4F46\u672A\u8BC6\u522B\u5230\u4F01\u4E1A\u5217\u8868\u3002
\u539F\u59CB\u6570\u636E:
${JSON.stringify(data, null, 2).substring(0, 2e3)}`;
  }
  const total = data.totalCount || data.total || companies.length;
  let output = `\u641C\u7D22: "${keyword}" (\u5171 ${total} \u6761\uFF0C\u5F53\u524D ${companies.length} \u6761)
${"=".repeat(60)}

`;
  companies.forEach((c, i) => {
    output += formatCompany(c, i + 1) + "\n\n";
  });
  return output;
}
function formatStreamResults(events, keyword, raw) {
  if (raw) return JSON.stringify(events, null, 2);
  if (events.length === 0) return `\u6DF1\u5EA6\u641C\u7D22"${keyword}"\u672A\u8FD4\u56DE\u4EFB\u4F55\u4E8B\u4EF6\u6570\u636E\u3002`;
  let output = `\u6DF1\u5EA6\u641C\u7D22: "${keyword}" (\u6536\u5230 ${events.length} \u4E2A\u4E8B\u4EF6)
${"=".repeat(60)}

`;
  events.forEach((evt, i) => {
    output += `--- \u4E8B\u4EF6 ${i + 1} ---
`;
    if (evt.ret) output += `\u72B6\u6001: ${evt.ret.join(", ")}
`;
    if (evt.data) {
      const data = evt.data;
      if (data.reasoning) output += `\u63A8\u7406: ${data.reasoning}
`;
      if (data.companyList || data.resultList) {
        const list = data.companyList || data.resultList || [];
        output += `\u4F01\u4E1A\u5217\u8868 (${list.length} \u6761):
`;
        list.forEach((c, j) => {
          output += formatCompany(c, j + 1) + "\n";
        });
      } else {
        output += JSON.stringify(data, null, 2).substring(0, 1e3) + "\n";
      }
    }
    output += "\n";
  });
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
