const crypto = require("crypto");
const fs = require("fs");
const { COOKIE_FILE, BASE_URL, APP_KEY, UA } = require("./config");
const { httpGet } = require("./http");

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

module.exports = { loadCookie, saveCookie, extractToken, generateSign, generateSpid, fetchToken };
