/**
 * 输出格式化
 *
 * 三种模式：table（默认，人读）/ json（机器读）/ markdown（喂给模型或贴文档）
 * 全部手写实现，零依赖；输出只到 stdout，且不包含任何 API Key。
 *
 * 注意：json 模式直接输出接口原始响应结构，不注入任何内部字段。
 */

const CONTENT_PREVIEW_MAX = 500;

/**
 * 截断超长文本
 * @param {string} str
 * @param {number} max 最大字符数
 * @returns {string}
 */
function truncate(str, max) {
  const s = str === undefined || str === null ? "" : String(str);
  if (!Number.isFinite(max) || s.length <= max) return s;
  return s.slice(0, max) + "…";
}

/** 显示宽度：中日韩全角字符按 2 列计算，其余按 1 列 */
function displayWidth(str) {
  let width = 0;
  for (const ch of String(str)) {
    width += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(ch) ? 2 : 1;
  }
  return width;
}

/** 按显示宽度右侧补空格 */
function padCell(str, width) {
  const s = String(str);
  return s + " ".repeat(Math.max(0, width - displayWidth(s)));
}

/** 日期只保留 YYYY-MM-DD，未知显示 - */
function shortDate(value) {
  if (typeof value !== "string" || !value.trim()) return "-";
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : value.slice(0, 10);
}

/** 权威性：-1 / null 表示未知，统一显示 - */
function authorityText(value) {
  if (value === undefined || value === null || value === -1) return "-";
  return String(value);
}

/** 保留两位小数的分数 */
function scoreText(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

/**
 * 结果数组 -> 对齐表格（手写对齐，不引三方库）
 * @param {any[]} results
 * @returns {string}
 */
function resultsToTable(results) {
  const list = Array.isArray(results) ? results : [];
  const headers = ["序号", "score", "auth", "日期", "title", "url"];
  const rows = list.map((r, i) => {
    const item = r || {};
    return [
      String(i + 1),
      scoreText(item.rerank_score),
      authorityText(item.authority),
      shortDate(item.date),
      truncate(item.title || "(无标题)", 60),
      String(item.url || "-"),
    ];
  });

  const widths = headers.map((h, i) =>
    Math.max(displayWidth(h), ...rows.map((row) => displayWidth(row[i])))
  );

  const lines = [];
  lines.push(widths.map((wd, i) => padCell(headers[i], wd)).join("  "));
  lines.push(widths.map((wd) => "-".repeat(wd)).join("  "));
  for (const row of rows) {
    lines.push(row.map((cell, i) => padCell(cell, widths[i])).join("  "));
  }
  return lines.join("\n");
}

/** 汇总行 */
function summaryLine(data) {
  const results = Array.isArray(data && data.results) ? data.results : [];
  const query = data && typeof data.query === "string" ? data.query : "";
  return query ? `共 ${results.length} 条结果（query: ${query}）` : `共 ${results.length} 条结果`;
}

/** markdown 列表模式（保持精简：只给标题 / 链接 / 元信息 / 摘要） */
function toMarkdown(data) {
  const results = Array.isArray(data && data.results) ? data.results : [];
  const lines = [`## ${summaryLine(data)}`, ""];
  results.forEach((r, i) => {
    const item = r || {};
    const title = truncate(item.title || "(无标题)", 60);
    lines.push(`${i + 1}. [${title}](${item.url || "#"})`);
    lines.push(`   - 日期：${shortDate(item.date)} ｜ 权威：${authorityText(item.authority)} ｜ 相关分：${scoreText(item.rerank_score)}`);
    const summary = item.summary || item.snippet;
    if (summary) lines.push(`   - 摘要：${truncate(summary, 500)}`);
    lines.push("");
  });
  return lines.join("\n").replace(/\n+$/, "");
}

/**
 * 渲染为指定格式
 * @param {any} data 接口原始响应
 * @param {{format?:"table"|"json"|"markdown",wantContent?:boolean}} [opts]
 * @returns {string}
 */
function formatResults(data, opts) {
  const options = opts || {};
  const format = options.format || "table";
  // json：原样输出接口响应，不注入任何内部字段
  if (format === "json") return JSON.stringify(data, null, 2);
  if (format === "markdown") return toMarkdown(data);
  return renderSearchResults(data, { wantContent: Boolean(options.wantContent) });
}

/**
 * 逐条可读输出（表格 + 每条详情）
 * @param {any} data
 * @param {{wantContent?:boolean}} [opts] wantContent 为真时附正文预览（500 字符截断）
 * @returns {string}
 */
function renderSearchResults(data, opts) {
  const wantContent = Boolean(opts && opts.wantContent);
  const results = Array.isArray(data && data.results) ? data.results : [];
  const blocks = [summaryLine(data), "", resultsToTable(results)];

  results.forEach((r, i) => {
    const item = r || {};
    blocks.push("");
    blocks.push(`--- [${i + 1}] ${item.title || "(无标题)"}`);
    blocks.push(`url: ${item.url || "-"}`);
    blocks.push(`日期: ${shortDate(item.date)} ｜ 权威: ${authorityText(item.authority)} ｜ 相关分: ${scoreText(item.rerank_score)}`);

    const summary = item.summary || item.snippet;
    if (summary) blocks.push(`摘要: ${truncate(summary, 500)}`);

    const content = typeof item.content === "string" ? item.content : "";
    if (wantContent && content) {
      const clipped = truncate(content, CONTENT_PREVIEW_MAX);
      const note = content.length > CONTENT_PREVIEW_MAX ? "（内容超过 500 字符，已截断）" : "";
      blocks.push(`正文${note}: ${clipped}`);
    }
  });

  return blocks.join("\n");
}

/**
 * 渲染 Fetch 结果
 * @param {any} data
 * @param {{raw?:boolean}} [opts] raw 时只返回正文
 * @returns {string}
 */
function renderFetchResult(data, opts) {
  const options = opts || {};
  const content = typeof (data && data.content) === "string" ? data.content : "";
  if (options.raw) return content;
  const title = data && data.title ? String(data.title) : "(无标题)";
  return `# ${title}\n\n${content}`;
}

module.exports = {
  formatResults,
  resultsToTable,
  renderSearchResults,
  renderFetchResult,
  truncate,
  shortDate,
  authorityText,
  displayWidth,
  CONTENT_PREVIEW_MAX,
};
