const { APP_KEY, BASE_URL } = require("./config");
const { buildHeaders, httpGet, httpGetStream } = require("./http");
const { extractToken, generateSign, generateSpid, fetchToken } = require("./auth");

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

// ─── 按人名查关联企业 ───
async function searchByPerson(keyword, cookie, pageNo, pageSize) {
  if (!cookie) {
    const auth = await fetchToken();
    cookie = auth.cookie;
  }
  const token = extractToken(cookie);
  if (!token) throw new Error("Cookie 中未找到 _m_h5_tk");

  const t = Date.now().toString();
  const data = JSON.stringify({
    keyword,
    pageNo,
    pageSize,
    extra: { action: "change" },
    province: "",
    industryLv1: "",
    industryLv2: "",
  });
  const sign = generateSign(token, t, APP_KEY, data);

  const qs = new URLSearchParams({
    jsv: "2.5.8",
    appKey: APP_KEY,
    t,
    sign,
    dangerouslySetWindvaneParams: "[object Object]",
    api: "com.alibaba.china.business.query.relation.person.ent.query.search",
    v: "2.0",
    dataType: "json",
    timeout: "20000",
    type: "originaljson",
    data,
  });

  const url = `${BASE_URL}/com.alibaba.china.business.query.relation.person.ent.query.search/2.0/?${qs}`;
  const { body } = await httpGet(url, buildHeaders(cookie, "application/json"));
  return JSON.parse(body);
}

// ─── 专利搜索 ───
async function searchPatent(keyword, cookie, pageNo, pageSize) {
  if (!cookie) {
    const auth = await fetchToken();
    cookie = auth.cookie;
  }
  const token = extractToken(cookie);
  if (!token) throw new Error("Cookie 中未找到 _m_h5_tk");

  const t = Date.now().toString();
  const data = JSON.stringify({
    keyWord: keyword,
    pageSize: String(pageSize),
    pageNo,
    patentStatus: "all",
    timeLimitType: "all",
    patentType: "all",
  });
  const sign = generateSign(token, t, APP_KEY, data);

  const qs = new URLSearchParams({
    jsv: "2.5.8",
    appKey: APP_KEY,
    t,
    sign,
    dangerouslySetWindvaneParams: "[object Object]",
    api: "mtop.com.alibaba.business.query.tools.app.patent.search",
    v: "2.0",
    dataType: "json",
    timeout: "20000",
    type: "originaljson",
    data,
  });

  const url = `${BASE_URL}/mtop.com.alibaba.business.query.tools.app.patent.search/2.0/?${qs}`;
  const { body } = await httpGet(url, buildHeaders(cookie, "application/json"));
  return JSON.parse(body);
}

module.exports = { searchCompanies, deepSearch, searchByPerson, searchPatent };
