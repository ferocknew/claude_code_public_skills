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

function extractCompanies(data) {
  return Array.isArray(data.data) ? data.data
    : Array.isArray(data.resultList) ? data.resultList
    : Array.isArray(data.companyList) ? data.companyList
    : [];
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
  const companies = extractCompanies(data);

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

function formatPersonResults(result, keyword, raw) {
  if (raw) return JSON.stringify(result, null, 2);

  if (!result.data) {
    const ret = result.ret || [];
    if (ret.length > 0 && ret[0] !== "SUCCESS::调用成功") {
      return `API 错误: ${ret.join(", ")}\n\n可能 Cookie 已过期，请重新获取。`;
    }
    return `搜索"${keyword}"未返回数据。`;
  }

  const data = result.data;
  const companies = extractCompanies(data);

  if (companies.length === 0) {
    return `未找到"${keyword}"的关联企业。`;
  }

  const total = data.total || data.totalCount || companies.length;
  let output = `"${keyword}"关联企业: ${total} 条结果\n\n`;

  companies.forEach((c, i) => {
    output += formatCompany(c, i + 1) + "\n\n";
  });

  return output;
}

function formatPatentResults(result, keyword, raw) {
  if (raw) return JSON.stringify(result, null, 2);

  if (!result.data) {
    const ret = result.ret || [];
    if (ret.length > 0 && ret[0] !== "SUCCESS::调用成功") {
      return `API 错误: ${ret.join(", ")}\n\n可能 Cookie 已过期，请重新获取。`;
    }
    return `搜索"${keyword}"的专利未返回数据。`;
  }

  const data = result.data;
  const patents = Array.isArray(data.data) ? data.data
    : Array.isArray(data.resultList) ? data.resultList
    : Array.isArray(data.patentList) ? data.patentList
    : [];

  if (patents.length === 0) {
    return `未找到"${keyword}"的相关专利。`;
  }

  const total = data.total || data.totalCount || patents.length;
  let output = `"${keyword}"专利: ${total} 条结果\n\n`;

  patents.forEach((p, i) => {
    const title = stripEm(p.title || p.patentName || "未知");
    output += `${i + 1}. ${title}\n`;
    if (p.applyNo || p.patentNo) output += `   申请号: ${p.applyNo || p.patentNo}`;
    if (p.applyDate || p.filingDate) output += ` | 申请日: ${p.applyDate || p.filingDate}`;
    output += "\n";
    if (p.patentType || p.type) output += `   类型: ${p.patentType || p.type}`;
    if (p.status || p.patentStatus) output += ` | 状态: ${p.status || p.patentStatus}`;
    output += "\n";
    if (p.applicant || p.applyPerson) output += `   申请人: ${p.applicant || p.applyPerson}\n`;
    if (p.inventor || p.inventorList) {
      const inventors = Array.isArray(p.inventorList) ? p.inventorList.join(", ") : p.inventor;
      output += `   发明人: ${inventors}\n`;
    }
    output += "\n";
  });

  return output;
}

function formatReportResults(events, keyword, raw) {
  if (raw) return JSON.stringify(events, null, 2);
  if (events.length === 0) return `企业背调"${keyword}"未返回任何数据。`;

  let reportText = "";
  let sections = [];

  for (const evt of events) {
    if (!evt.data) continue;
    let inner;
    try {
      const payload = typeof evt.data === "string" ? JSON.parse(evt.data) : evt.data;
      inner = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;
    } catch { continue; }

    if (typeof inner === "string") {
      reportText += inner;
    } else if (inner.text || inner.content || inner.chunk) {
      reportText += inner.text || inner.content || inner.chunk;
    } else if (inner.phase === "text" && inner.summary) {
      reportText += inner.summary;
    } else if (inner.section || inner.title) {
      sections.push(inner);
    }
  }

  let output = `企业背调报告: "${keyword}"\n\n`;

  if (reportText) {
    output += reportText + "\n";
  } else if (sections.length > 0) {
    sections.forEach((s) => {
      if (s.title) output += `## ${s.title}\n`;
      if (s.content || s.text) output += `${s.content || s.text}\n`;
      output += "\n";
    });
  }

  if (!reportText && sections.length === 0) {
    output += `未提取到有效内容。使用 --raw 查看原始数据。\n`;
  }

  return output;
}

module.exports = { formatResults, formatStreamResults, formatPersonResults, formatPatentResults, formatReportResults };
