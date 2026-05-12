#!/usr/bin/env node

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";
const APP_KEY = "12574478";
const BASE_URL = "https://acs-m.88cha.com/h5";
const COOKIE_FILE = path.join(__dirname, ".cookie");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const CH_UA = '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"';

// ─── Cookie 持久化 ───
function loadCookie() {
  try { return fs.readFileSync(COOKIE_FILE, "utf8").trim(); }
  catch { return ""; }
}
function saveCookie(cookie) {
  fs.writeFileSync(COOKIE_FILE, cookie, "utf8");
}

// ─── MTOP 签名 ───
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

// ─── 命令行参数 ───
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
  console.log(`88查企业搜索 v${SKILL_VERSION}

用法: node skill.js <关键词> [选项]

选项:
  --cookie, -k <string>  88cha.com 完整 Cookie（首次传入后自动保存）
  --page,   -p <number>  页码（默认: 1）
  --size,   -s <number>  每页数量（默认: 10）
  --stream, -S           深度搜索模式（SSE 流式返回）
  --raw                  输出原始 JSON
  --help,  -h            显示帮助

示例:
  node skill.js "腾讯" --cookie "YOUR_COOKIE"     # 首次使用，自动保存 Cookie
  node skill.js "阿里巴巴"                         # 后续直接搜索
  node skill.js "字节跳动" --page 2                # 翻页
  node skill.js "华为" --stream                    # 深度搜索
  node skill.js "小米" --raw                       # 原始 JSON 输出
`);
}

// ─── HTTP 请求 ───
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
    "sec-ch-ua-platform": '"Windows"',
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
      res.on("data", c => data += c);
      res.on("end", () => resolve({ body: data, cookies: res.headers["set-cookie"] || [] }));
    }).on("error", reject);
  });
}

// ─── 自动获取 MTOP Token（无需手动提供 Cookie）───
async function fetchToken() {
  const t = Date.now().toString();
  const dummySign = "0".repeat(32);
  const url = `${BASE_URL}/mtop.com.alibaba.business.query.recommendcompany/2.0/?jsv=2.5.8&appKey=${APP_KEY}&t=${t}&sign=${dummySign}&api=mtop.com.alibaba.business.query.recommendcompany&v=2.0&dataType=json&data=%7B%7D`;

  const { cookies } = await httpGet(url, {
    "User-Agent": UA,
    "Origin": "https://88cha.com",
  });

  let tk = "", tkEnc = "";
  for (const c of cookies) {
    const m1 = c.match(/_m_h5_tk=([^;]+)/);
    if (m1) tk = m1[1];
    const m2 = c.match(/_m_h5_tk_enc=([^;]+)/);
    if (m2) tkEnc = m2[1];
  }

  if (!tk) throw new Error("自动获取 Token 失败");
  return { tk, tkEnc, token: tk.split("_")[0], cookie: `_m_h5_tk=${tk}; _m_h5_tk_enc=${tkEnc}; mtop_partitioned_detect=1` };
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
      res.on("data", chunk => {
        buffer += chunk;
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop();

        for (const part of parts) {
          for (const line of part.split("\n")) {
            if (line.startsWith("data:")) {
              try {
                events.push(JSON.parse(line.slice(5).trim()));
              } catch { /* skip */ }
            }
          }
        }
      });

      res.on("end", () => {
        if (buffer.trim()) {
          for (const line of buffer.split("\n")) {
            if (line.startsWith("data:")) {
              try { events.push(JSON.parse(line.slice(5).trim())); } catch { /* skip */ }
            }
          }
        }
        resolve(events);
      });
    }).on("error", reject);
  });
}

// ─── 企业搜索（JSON API）───
async function searchCompanies(keyword, cookie, pageNo, pageSize) {
  if (!cookie) {
    const auth = await fetchToken();
    cookie = auth.cookie;
  }
  const token = extractToken(cookie);
  if (!token) throw new Error("Cookie 中未找到 _m_h5_tk");

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
    data,
  });

  const url = `${BASE_URL}/mtop.com.alibaba.business.query.recommendcompany/2.0/?${qs}`;
  const { body } = await httpGet(url, buildHeaders(cookie, "application/json"));
  return JSON.parse(body);
}

// ─── 深度搜索（SSE API）───
async function deepSearch(keyword, cookie) {
  if (!cookie) {
    const auth = await fetchToken();
    cookie = auth.cookie;
  }
  const token = extractToken(cookie);
  if (!token) throw new Error("Cookie 中未找到 _m_h5_tk");

  const t = Date.now().toString();
  const spid = generateSpid();
  const data = JSON.stringify({
    action: "first",
    query: keyword,
    enableReasoning: false,
    scene: "default",
    sessionId: "",
    spid,
    target: "search_result_page",
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
    data,
  });

  const url = `${BASE_URL}/mtop.com.alibaba.business.query.supersearchreasoning/2.0/?${qs}`;
  return httpGetStream(url, buildHeaders(cookie, "text/event-stream, text/event-stream"));
}

// ─── 结果格式化 ───
function stripEm(str) {
  return String(str).replace(/<\/?em>/g, "");
}

const DISPLAY_FIELDS = [
  ["legal_name", "法定代表人"],
  ["reg_cap", "注册资本"],
  ["es_date", "成立日期"],
  ["ent_status", "经营状态"],
  ["address", "注册地址"],
  ["social_credit_code", "统一社会信用代码"],
  ["currencyType", "货币类型"],
  ["ability_label_outside", "能力标签"],
];

function formatCompany(company, index) {
  const name = stripEm(company.ent_name || company.companyName || "未知");
  const lines = [`${index}. ${name}`];

  for (const [key, label] of DISPLAY_FIELDS) {
    const val = company[key];
    if (val == null || val === "" || (Array.isArray(val) && val.length === 0)) continue;
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
    if (ret.length > 0 && ret[0] !== "SUCCESS::调用成功") {
      return `API 错误: ${ret.join(", ")}\n\n可能 Cookie 已过期，请重新获取。`;
    }
    return `搜索"${keyword}"未返回数据。`;
  }

  const data = result.data;
  const companies = Array.isArray(data.data) ? data.data
    : Array.isArray(data.resultList) ? data.resultList
    : Array.isArray(data.companyList) ? data.companyList
    : [];

  if (companies.length === 0) {
    return `搜索"${keyword}"未找到企业。`;
  }

  const total = data.total || data.totalCount || companies.length;
  let output = `搜索"${keyword}": ${total} 条结果\n\n`;

  companies.forEach((c, i) => {
    const name = stripEm(c.ent_name || c.companyName || "未知");
    output += `${i + 1}. ${name}\n`;
    if (c.legal_name) output += `   法人: ${c.legal_name}`;
    if (c.reg_cap) output += ` | 注册资本: ${c.reg_cap}`;
    if (c.ent_status) output += ` | 状态: ${c.ent_status}`;
    output += "\n";
    if (c.es_date) output += `   成立: ${c.es_date}`;
    if (c.address) output += ` | 地址: ${c.address}`;
    output += "\n";
    if (c.social_credit_code) output += `   信用代码: ${c.social_credit_code}\n`;
  });

  return output;
}

function formatStreamResults(events, keyword, raw) {
  if (raw) return JSON.stringify(events, null, 2);
  if (events.length === 0) return `深度搜索"${keyword}"未返回任何数据。`;

  // 从 SSE 事件流中提取最终摘要（取最后一个 text phase 的 summary）
  let summary = "";
  let companies = [];

  for (const evt of events) {
    if (!evt.data) continue;
    let inner;
    try {
      const payload = typeof evt.data === "string" ? JSON.parse(evt.data) : evt.data;
      inner = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;
    } catch { continue; }

    if (inner.phase === "text" && inner.summary) {
      summary = inner.summary;
    }
    if (inner.companyList || inner.resultList) {
      companies = inner.companyList || inner.resultList;
    }
  }

  let output = `深度搜索"${keyword}"\n\n`;

  if (summary) {
    output += `## AI 分析摘要\n${summary}\n\n`;
  }

  if (companies.length > 0) {
    output += `## 相关企业 (${companies.length} 条)\n`;
    companies.forEach((c, i) => {
      output += formatCompany(c, i + 1) + "\n\n";
    });
  }

  if (!summary && companies.length === 0) {
    output += `未提取到有效内容。使用 --raw 查看原始数据。\n`;
  }

  return output;
}

// ─── 主流程 ───
async function main() {
  const params = parseArgs();

  if (!params.keyword) {
    console.error("错误：请提供搜索关键词");
    console.log("用法: node skill.js <关键词>");
    process.exit(1);
  }

  if (!params.cookie) {
    console.log("(自动获取 Token...)\n");
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("88查企业搜索");
  console.log(`${"=".repeat(60)}\n`);

  try {
    if (params.stream) {
      console.log(`深度搜索: "${params.keyword}"\n`);
      const events = await deepSearch(params.keyword, params.cookie);
      console.log(formatStreamResults(events, params.keyword, params.raw));
    } else {
      console.log(`企业搜索: "${params.keyword}" (第${params.page}页)\n`);
      const result = await searchCompanies(params.keyword, params.cookie, params.page, params.pageSize);
      console.log(formatResults(result, params.keyword, params.raw));
    }
  } catch (e) {
    console.error(`搜索失败: ${e.message}`);
    if (e.message.includes("_m_h5_tk") || e.message.includes("Cookie")) {
      console.log("\n请重新获取 Cookie：");
      console.log("1. 打开 https://88cha.com/");
      console.log("2. 登录账户");
      console.log("3. F12 → Network → 任意请求 → Headers → 复制完整 Cookie 值");
    }
    process.exit(1);
  }

  console.log(`${"=".repeat(60)}`);
  console.log("完成！");
  console.log(`${"=".repeat(60)}\n`);
}

main();
