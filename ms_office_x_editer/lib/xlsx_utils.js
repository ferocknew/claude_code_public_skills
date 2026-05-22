/**
 * xlsx_utils — xlsx XML 解析工具
 *
 * 单元格坐标转换、sharedStrings 解析/构建、XML 属性操作
 */

const { encodeXmlEntities, decodeXmlEntities } = require("./xml_utils");

// ─── 单元格坐标转换 ──────────────────────────────────────────────

/**
 * 列字母转列号：A→0, B→1, ..., Z→25, AA→26
 */
function colLetterToIndex(letter) {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col - 1;
}

/**
 * 列号转列字母：0→A, 1→B, ..., 25→Z, 26→AA
 */
function colIndexToLetter(index) {
  let letter = "";
  let n = index + 1;
  while (n > 0) {
    n--;
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26);
  }
  return letter;
}

/**
 * 单元格引用转坐标：A1→{col:0, row:0}, B3→{col:1, row:2}
 */
function refToCoord(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { col: colLetterToIndex(m[1]), row: parseInt(m[2], 10) - 1 };
}

/**
 * 坐标转单元格引用：{col:0, row:0}→A1
 */
function coordToRef(col, row) {
  return colIndexToLetter(col) + (row + 1);
}

/**
 * 解析区域引用：A1:C3 → {startCol, startRow, endCol, endRow}
 */
function parseRange(rangeStr) {
  const parts = rangeStr.split(":");
  if (parts.length !== 2) return null;
  const start = refToCoord(parts[0]);
  const end = refToCoord(parts[1]);
  if (!start || !end) return null;
  return { startCol: start.col, startRow: start.row, endCol: end.col, endRow: end.row };
}

// ─── XML 属性操作 ────────────────────────────────────────────────

/**
 * 从 XML 标签中读取属性值
 */
function getXmlAttr(tag, attrName) {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*"([^"]*)"`, "i");
  const m = tag.match(re);
  return m ? m[1] : null;
}

/**
 * 设置 XML 标签中的属性值（存在则更新，不存在则追加）
 */
function setXmlAttr(tag, attrName, value) {
  const re = new RegExp(`(\\b${attrName}\\s*=\\s*)"[^"]*"`, "i");
  if (re.test(tag)) {
    return tag.replace(re, `$1"${value}"`);
  }
  // 追加到标签闭合之前
  return tag.replace(/(\/?>)$/, ` ${attrName}="${value}"$1`);
}

// ─── sharedStrings.xml 处理 ──────────────────────────────────────

/**
 * 解析 sharedStrings.xml，返回 { strings: string[], xml: string }
 * strings[i] 对应 <si> 索引 i 的文本
 */
function parseSharedStrings(xml) {
  if (!xml) return { strings: [], xml: null };

  const strings = [];
  // 匹配所有 <si>...</si> 块
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml)) !== null) {
    const siContent = m[1];
    // 提取 <t> 文本（可能直接在 <si> 下或嵌套在 <r><t> 中）
    let text = "";
    // 尝试直接 <t>...</t>
    const directT = siContent.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
    if (directT) {
      text = decodeXmlEntities(directT[1]);
    } else {
      // 富文本 <r><t>...</t></r> 拼接
      const rTRe = /<r\b[^>]*>[\s\S]*?<t\b[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/r>/g;
      let rm;
      while ((rm = rTRe.exec(siContent)) !== null) {
        text += decodeXmlEntities(rm[1]);
      }
    }
    strings.push(text);
  }
  return { strings, xml };
}

/**
 * 构建 sharedStrings.xml 内容
 */
function buildSharedStrings(strings) {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">`;
  for (const s of strings) {
    xml += `<si><t>${encodeXmlEntities(s)}</t></si>`;
  }
  xml += "</sst>";
  return xml;
}

/**
 * 查找或追加 sharedString 索引
 * 返回 { index, strings, updated }
 */
function findOrAddSharedString(strings, text) {
  const idx = strings.indexOf(text);
  if (idx !== -1) return { index: idx, strings, updated: false };
  strings.push(text);
  return { index: strings.length - 1, strings, updated: true };
}

// ─── 工作表 XML 中的单元格操作 ────────────────────────────────────

/**
 * 从 sheetXml 中提取所有 <row> 块
 * 返回 [{xml, start, end, rowNum}]
 */
function extractRows(sheetXml) {
  const rows = [];
  const rowRe = /<row\b[^>]*\br="(\d+)"[^>]*>/g;
  let m;
  while ((m = rowRe.exec(sheetXml)) !== null) {
    const rowStart = m.index;
    const rowNum = parseInt(m[1], 10);
    // 找到 </row> 闭合标签
    const closeIdx = sheetXml.indexOf("</row>", rowStart);
    if (closeIdx === -1) continue;
    const rowEnd = closeIdx + "</row>".length;
    rows.push({ xml: sheetXml.substring(rowStart, rowEnd), start: rowStart, end: rowEnd, rowNum });
  }
  return rows;
}

/**
 * 从一个 <row> 块中提取所有 <c> 单元格
 * 返回 [{xml, ref, col, row}]
 */
function extractCells(rowXml, rowNum) {
  const cells = [];
  // 匹配 <c r="XX" ...>...</c> 或 <c r="XX" .../>
  const cRe = /<c\b[^>]*\br="([A-Z]+\d+)"[^>]*(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = cRe.exec(rowXml)) !== null) {
    const ref = m[1];
    const coord = refToCoord(ref);
    if (!coord) continue;
    cells.push({
      xml: m[0],
      ref,
      col: coord.col,
      row: coord.row,
      content: m[2] || "",
    });
  }
  return cells;
}

/**
 * 构建一个单元格 XML
 * @param {string} ref - 单元格引用如 A1
 * @param {string} type - "s"(sharedString), "n"(number), "b"(boolean), "str"(inline string)
 * @param {string} value - 值
 * @param {number|null} styleIndex - 样式索引
 */
function buildCellXml(ref, type, value, styleIndex) {
  const sAttr = styleIndex !== null && styleIndex !== undefined ? ` s="${styleIndex}"` : "";
  if (type === "s") {
    return `<c r="${ref}"${sAttr} t="s"><v>${value}</v></c>`;
  } else if (type === "n") {
    return `<c r="${ref}"${sAttr}><v>${value}</v></c>`;
  } else if (type === "b") {
    return `<c r="${ref}"${sAttr} t="b"><v>${value ? "1" : "0"}</v></c>`;
  } else {
    // inline string
    return `<c r="${ref}"${sAttr} t="str"><v>${encodeXmlEntities(value)}</v></c>`;
  }
}

/**
 * 从单元格 XML 中提取值和类型
 */
function parseCellValue(cellXml) {
  const type = getXmlAttr(cellXml, "t") || "n";
  const vMatch = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
  const rawValue = vMatch ? vMatch[1] : "";
  return { type, value: rawValue };
}

/**
 * 检测值的类型
 */
function detectValueType(value) {
  if (typeof value === "number") return "n";
  if (typeof value === "boolean") return "b";
  if (typeof value === "string") {
    // 纯数字字符串视为数字
    if (/^-?\d+(\.\d+)?$/.test(value)) return "n";
    return "s"; // 默认用 sharedString
  }
  return "s";
}

/**
 * 更新 sheet 的 dimension 属性
 */
function updateDimension(sheetXml, maxCol, maxRow) {
  const dimRef = maxCol >= 0 && maxRow >= 0
    ? `A1:${coordToRef(maxCol, maxRow)}`
    : "A1";
  return sheetXml.replace(
    /<dimension\s+ref="[^"]*"/,
    `<dimension ref="${dimRef}"`
  );
}

module.exports = {
  colLetterToIndex,
  colIndexToLetter,
  refToCoord,
  coordToRef,
  parseRange,
  getXmlAttr,
  setXmlAttr,
  parseSharedStrings,
  buildSharedStrings,
  findOrAddSharedString,
  extractRows,
  extractCells,
  buildCellXml,
  parseCellValue,
  detectValueType,
  updateDimension,
};
