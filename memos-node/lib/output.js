/**
 * 输出格式化
 *
 * 支持格式：
 *   json   完整 JSON（默认）
 *   yaml   同内容 YAML，比 JSON 省约 40% token，适合 LLM 阅读
 *   table  表格（仅对数组有效，按对象的键展开）
 */

/**
 * @param {*} data 待输出数据
 * @param {string} format json | yaml | table
 */
function output(data, format = "json") {
  if (data === null || data === undefined) {
    console.log("(空)");
    return;
  }

  if (format === "yaml") {
    process.stdout.write(toYaml(data));
    return;
  }

  if (format === "table") {
    renderAsTable(data);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

/**
 * 表格渲染入口
 * 数组直接渲染；对象则挑出其中第一个「对象数组」字段渲染成表，
 * 其余标量字段（count / nextPageToken 等）作为表头信息先打印。
 * @param {*} data
 */
function renderAsTable(data) {
  if (Array.isArray(data)) {
    renderTable(data);
    return;
  }

  if (typeof data !== "object") {
    console.log(String(data));
    return;
  }

  const arrayKey = Object.keys(data).find(
    (k) => Array.isArray(data[k]) && data[k].length > 0 && typeof data[k][0] === "object"
  );

  if (!arrayKey) {
    renderKeyValue(data);
    return;
  }

  const scalars = Object.entries(data).filter(([, v]) => v === null || typeof v !== "object");
  if (scalars.length) {
    console.log(scalars.map(([k, v]) => `${k}: ${v}`).join("  "));
    console.log("");
  }
  renderTable(data[arrayKey]);
}

/**
 * 把对象渲染成「键 | 值」两列表格，嵌套对象展开为点号路径
 * @param {Object} data
 */
function renderKeyValue(data) {
  const rows = [];
  flatten(data, "", rows);

  const width = Math.max(...rows.map(([k]) => displayWidth(k)));
  const sep = "-".repeat(width + 2) + "+" + "-".repeat(52);
  console.log(sep);
  for (const [k, v] of rows) {
    const value = String(v).replace(/\s+/g, " ");
    console.log(` ${pad(k, width)} | ${value.length > 100 ? `${value.slice(0, 97)}...` : value}`);
  }
  console.log(sep);
}

/**
 * 递归展开对象为扁平的 [路径, 值] 列表
 * @param {*} value
 * @param {string} prefix
 * @param {Array<[string, *]>} out
 */
function flatten(value, prefix, out) {
  if (value === null || typeof value !== "object") {
    out.push([prefix, value]);
    return;
  }
  if (Array.isArray(value)) {
    out.push([prefix, value.length ? value.join(", ") : "[]"]);
    return;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    out.push([prefix, "{}"]);
    return;
  }
  for (const [k, v] of entries) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
}

/**
 * 渲染数组为表格
 * 若首元素带 _columns 提示则按提示取列，否则取首个对象的标量字段
 * @param {Object[]} items
 */
function renderTable(items) {
  if (items.length === 0) {
    console.log("(无结果)");
    return;
  }

  const hinted = items[0]._columns;
  const columns = Array.isArray(hinted)
    ? hinted
    : Object.keys(items[0]).filter(
        (k) => items[0][k] === null || typeof items[0][k] !== "object"
      );

  if (columns.length === 0) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  const rows = items.map((item) =>
    columns.map((c) => {
      const v = item[c];
      if (v === null || v === undefined) return "";
      const s = (Array.isArray(v) ? v.join(",") : String(v)).replace(/\s+/g, " ");
      return s.length > 60 ? `${s.slice(0, 57)}...` : s;
    })
  );

  const widths = columns.map((c, i) =>
    Math.max(displayWidth(c), ...rows.map((r) => displayWidth(r[i])))
  );

  const sep = widths.map((w) => "-".repeat(w + 2)).join("+");
  console.log(sep);
  console.log(columns.map((c, i) => ` ${pad(c, widths[i])} `).join("|"));
  console.log(sep);
  for (const row of rows) {
    console.log(row.map((c, i) => ` ${pad(c, widths[i])} `).join("|"));
  }
  console.log(sep);
}

/**
 * 按显示宽度补齐（CJK 字符按 2 列计算）
 * @param {string} str
 * @param {number} width
 */
function pad(str, width) {
  const diff = width - displayWidth(str);
  return diff > 0 ? str + " ".repeat(diff) : str;
}

/**
 * 估算字符串的终端显示宽度
 * @param {string} str
 * @returns {number}
 */
function displayWidth(str) {
  let width = 0;
  for (const ch of String(str)) {
    width += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/.test(ch) ? 2 : 1;
  }
  return width;
}

/**
 * 极简 YAML 序列化（无外部依赖）
 * @param {*} data
 * @param {number} indent
 * @returns {string}
 */
function toYaml(data, indent = 0) {
  const pad = "  ".repeat(indent);

  if (data === null || data === undefined) return `${pad}null\n`;
  if (typeof data !== "object") return `${pad}${scalar(data)}\n`;

  if (Array.isArray(data)) {
    if (data.length === 0) return `${pad}[]\n`;
    return data
      .map((item) => {
        if (item === null || typeof item !== "object") return `${pad}- ${scalar(item)}\n`;
        const body = toYaml(item, indent + 1);
        // 首行并入 "- "，其余行保持缩进
        return `${pad}- ${body.slice(pad.length + 2)}`;
      })
      .join("");
  }

  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return `${pad}{}\n`;

  return entries
    .map(([k, v]) => {
      if (v !== null && typeof v === "object") {
        const empty = Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0;
        if (empty) return `${pad}${k}: ${Array.isArray(v) ? "[]" : "{}"}\n`;
        return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
      }
      return `${pad}${k}: ${scalar(v)}\n`;
    })
    .join("");
}

/**
 * 标量转 YAML 字面量
 * @param {*} v
 * @returns {string}
 */
function scalar(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  // 含特殊字符或看起来像数字/布尔时加引号，避免歧义
  if (s === "" || /^[\s]|[\s]$|[:#\-?&*!|>'"%@`{}\[\],]|^$/.test(s) || /^(true|false|null|~|\d+(\.\d+)?)$/i.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

module.exports = output;
module.exports.toYaml = toYaml;
