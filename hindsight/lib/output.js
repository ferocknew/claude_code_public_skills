/**
 * 输出格式化
 *
 *   json   完整 JSON（默认，适合程序与 LLM 解析）
 *   table  终端表格：数组或对象中的对象数组渲染成表，单对象渲染成「键 | 值」
 *
 * 全部手写实现，零依赖。列表优先展示 id / type / context / text 等常用字段。
 */

const PREFERRED_COLUMNS = [
  "id",
  "memory_id",
  "name",
  "type",
  "context",
  "text",
  "content",
  "tags",
  "occurred_start",
  "occurred_end",
  "created_at",
  "updated_at",
  "state",
  "score",
];

const MAX_CELL = 60;

/**
 * 输出数据
 * @param {*} data
 * @param {"json"|"table"} [format]
 */
function output(data, format = "json") {
  if (data === null || data === undefined) {
    console.log("(空)");
    return;
  }

  if (typeof data === "string") {
    console.log(data);
    return;
  }

  if (format === "table") {
    renderAsTable(data);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

/**
 * 表格入口
 * @param {*} data
 */
function renderAsTable(data) {
  if (Array.isArray(data)) {
    renderAnyArray(data);
    return;
  }

  if (typeof data !== "object") {
    console.log(String(data));
    return;
  }

  const arrayKey = Object.keys(data).find(
    (key) => Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === "object"
  );

  if (!arrayKey) {
    renderKeyValue(data);
    return;
  }

  const scalars = Object.entries(data).filter(([, value]) => value === null || typeof value !== "object");
  if (scalars.length) {
    console.log(scalars.map(([key, value]) => `${key}: ${value}`).join("  "));
    console.log("");
  }
  renderAnyArray(data[arrayKey]);
}

/**
 * 数组渲染：对象数组 -> 表格；标量数组 -> 逐行
 * @param {Array} items
 */
function renderAnyArray(items) {
  if (!Array.isArray(items) || items.length === 0) {
    console.log("(无结果)");
    return;
  }
  if (typeof items[0] !== "object" || items[0] === null) {
    for (const item of items) console.log(String(item));
    return;
  }
  renderTable(items);
}

/**
 * 对象渲染成「键 | 值」两列表格，嵌套对象展开为点号路径
 * @param {Object} data
 */
function renderKeyValue(data) {
  const rows = [];
  flatten(data, "", rows);

  const width = Math.max(...rows.map(([key]) => displayWidth(key)));
  const sep = `${"-".repeat(width + 2)}+${"-".repeat(52)}`;
  console.log(sep);
  for (const [key, value] of rows) {
    const text = String(value).replace(/\s+/g, " ");
    console.log(` ${pad(key, width)} | ${text.length > 100 ? `${text.slice(0, 97)}...` : text}`);
  }
  console.log(sep);
}

/**
 * 递归展开对象
 * @param {*} value
 * @param {string} prefix
 * @param {Array<[string,*]>} out
 */
function flatten(value, prefix, out) {
  if (value === null || typeof value !== "object") {
    out.push([prefix, value]);
    return;
  }
  if (Array.isArray(value)) {
    out.push([prefix, value.length ? value.map(stringifyCell).join(", ") : "[]"]);
    return;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    out.push([prefix, "{}"]);
    return;
  }
  for (const [key, child] of entries) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
}

/**
 * 渲染对象数组为表格
 * @param {Object[]} items
 */
function renderTable(items) {
  const columns = pickColumns(items);
  if (columns.length === 0) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  const rows = items.map((item) =>
    columns.map((column) => {
      const value = item[column];
      if (value === null || value === undefined) return "";
      const text = stringifyCell(value).replace(/\s+/g, " ");
      return text.length > MAX_CELL ? `${text.slice(0, MAX_CELL - 3)}...` : text;
    })
  );

  const widths = columns.map((column, index) =>
    Math.max(displayWidth(column), ...rows.map((row) => displayWidth(row[index])))
  );

  const sep = widths.map((width) => "-".repeat(width + 2)).join("+");
  console.log(sep);
  console.log(columns.map((column, index) => ` ${pad(column, widths[index])} `).join("|"));
  console.log(sep);
  for (const row of rows) {
    console.log(row.map((cell, index) => ` ${pad(cell, widths[index])} `).join("|"));
  }
  console.log(sep);
}

/**
 * 选择表格列：优先字段在前，其余标量字段补齐，最多 6 列
 * @param {Object[]} items
 * @returns {string[]}
 */
function pickColumns(items) {
  const first = items[0] || {};
  const keys = Object.keys(first).filter((key) => isScalarLike(first[key]));
  const preferred = PREFERRED_COLUMNS.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !preferred.includes(key));
  return [...preferred, ...rest].slice(0, 6);
}

/**
 * 是否适合直接放进表格单元格
 * @param {*} value
 * @returns {boolean}
 */
function isScalarLike(value) {
  return value === null || typeof value !== "object" || Array.isArray(value);
}

/**
 * 单元格字符串化
 * @param {*} value
 * @returns {string}
 */
function stringifyCell(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(stringifyCell).join(",");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  }
  return String(value);
}

/**
 * 按显示宽度右侧补空格（CJK 按 2 列）
 * @param {string} text
 * @param {number} width
 * @returns {string}
 */
function pad(text, width) {
  const diff = width - displayWidth(text);
  return diff > 0 ? text + " ".repeat(diff) : text;
}

/**
 * 估算终端显示宽度
 * @param {string} text
 * @returns {number}
 */
function displayWidth(text) {
  let width = 0;
  for (const ch of String(text)) {
    width += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch)
      ? 2
      : 1;
  }
  return width;
}

module.exports = output;
module.exports.renderAsTable = renderAsTable;
module.exports.renderKeyValue = renderKeyValue;
module.exports.renderTable = renderTable;
