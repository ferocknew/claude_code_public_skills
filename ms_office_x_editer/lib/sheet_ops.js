/**
 * sheet_ops — 工作表操作
 *
 * sheet 列表、单元格读写、区域读取、批量写入、sheet 重命名
 */

const {
  refToCoord, coordToRef, parseRange,
  extractRows, extractCells, buildCellXml,
  parseCellValue, detectValueType, updateDimension,
  findOrAddSharedString, buildSharedStrings, getXmlAttr,
} = require("./xlsx_utils");
const { encodeXmlEntities, decodeXmlEntities } = require("./xml_utils");

// ─── 工作表列表 ──────────────────────────────────────────────────

/**
 * 从 workbook.xml 和 rels 中提取 sheet 信息
 * 返回 [{name, sheetId, rId, target, index}]
 */
function listSheets(workbookXml, relsXml) {
  const sheets = [];
  const sheetRe = /<sheet\b[^>]*>/g;
  let m;
  while ((m = sheetRe.exec(workbookXml)) !== null) {
    const tag = m[0];
    const name = getXmlAttr(tag, "name");
    const sheetId = getXmlAttr(tag, "sheetId");
    const rId = getXmlAttr(tag, "r:id") || getXmlAttr(tag, "id");
    let target = "";
    if (rId && relsXml) {
      const relRe = new RegExp(`Relationship\\s+Id="${rId}"[^>]*Target="([^"]*)"`, "i");
      const rm = relsXml.match(relRe);
      if (!rm) {
        // 尝试另一种顺序
        const relRe2 = new RegExp(`Relationship[^>]*Id="${rId}"[^>]*Target="([^"]*)"`, "i");
        const rm2 = relsXml.match(relRe2);
        if (rm2) target = rm2[1];
      } else {
        target = rm[1];
      }
    }
    sheets.push({ name, sheetId: parseInt(sheetId, 10), rId, target, index: sheets.length });
  }
  return sheets;
}

/**
 * 获取 sheet 的完整内部路径
 */
function getSheetPath(sheet) {
  if (sheet.target.startsWith("xl/")) return sheet.target;
  return "xl/" + sheet.target;
}

// ─── 工作表信息 ──────────────────────────────────────────────────

/**
 * 获取工作表概览信息
 */
function getSheetInfo(sheetXml) {
  const rows = extractRows(sheetXml);
  let maxCol = -1;
  let maxRow = -1;
  let cellCount = 0;

  for (const row of rows) {
    const cells = extractCells(row.xml, row.rowNum);
    for (const cell of cells) {
      cellCount++;
      if (cell.col > maxCol) maxCol = cell.col;
      if (cell.row > maxRow) maxRow = cell.row;
    }
  }

  return {
    totalRows: rows.length,
    totalCells: cellCount,
    maxColumn: maxCol >= 0 ? maxCol + 1 : 0,
    maxRow: maxRow >= 0 ? maxRow + 1 : 0,
    dimension: maxCol >= 0 ? `A1:${coordToRef(maxCol, maxRow)}` : "A1",
  };
}

// ─── 读取工作表数据 ──────────────────────────────────────────────

/**
 * 读取整个工作表数据
 * 返回二维数组，null 表示空单元格
 */
function readSheet(sheetXml, sharedStrings) {
  const rows = extractRows(sheetXml);
  if (rows.length === 0) return { rows: 0, cols: 0, data: [] };

  let maxCol = 0;
  let maxRow = 0;

  // 先扫描确定范围
  for (const row of rows) {
    const cells = extractCells(row.xml, row.rowNum);
    for (const cell of cells) {
      if (cell.col > maxCol) maxCol = cell.col;
      if (cell.row > maxRow) maxRow = cell.row;
    }
  }

  // 初始化二维数组
  const data = [];
  for (let r = 0; r <= maxRow; r++) {
    data[r] = new Array(maxCol + 1).fill(null);
  }

  // 填充数据
  for (const row of rows) {
    const cells = extractCells(row.xml, row.rowNum);
    for (const cell of cells) {
      const { type, value } = parseCellValue(cell.xml);
      let cellValue = value;
      if (type === "s" && sharedStrings) {
        const idx = parseInt(value, 10);
        cellValue = sharedStrings[idx] || "";
      } else if (type === "n" && value !== "") {
        cellValue = parseFloat(value);
        if (Number.isInteger(cellValue) && !value.includes(".")) cellValue = parseInt(value, 10);
      } else if (type === "b") {
        cellValue = value === "1";
      }
      data[cell.row][cell.col] = cellValue;
    }
  }

  return { rows: maxRow + 1, cols: maxCol + 1, data };
}

/**
 * 读取指定单元格
 */
function readCell(sheetXml, col, row, sharedStrings) {
  const rows = extractRows(sheetXml);
  const rowNum = row + 1;
  for (const r of rows) {
    if (r.rowNum !== rowNum) continue;
    const cells = extractCells(r.xml, r.rowNum);
    for (const cell of cells) {
      if (cell.col === col && cell.row === row) {
        const { type, value } = parseCellValue(cell.xml);
        let cellValue = value;
        if (type === "s" && sharedStrings) {
          const idx = parseInt(value, 10);
          cellValue = sharedStrings[idx] || "";
        } else if (type === "n" && value !== "") {
          cellValue = parseFloat(value);
          if (Number.isInteger(cellValue) && !value.includes(".")) cellValue = parseInt(value, 10);
        } else if (type === "b") {
          cellValue = value === "1";
        }
        return { ref: coordToRef(col, row), type, value: cellValue };
      }
    }
  }
  return null;
}

/**
 * 读取区域数据
 */
function readRange(sheetXml, startCol, startRow, endCol, endRow, sharedStrings) {
  const result = [];
  for (let r = startRow; r <= endRow; r++) {
    const rowData = [];
    for (let c = startCol; c <= endCol; c++) {
      const cell = readCell(sheetXml, c, r, sharedStrings);
      rowData.push(cell ? cell.value : null);
    }
    result.push(rowData);
  }
  return {
    range: `${coordToRef(startCol, startRow)}:${coordToRef(endCol, endRow)}`,
    rows: result.length,
    cols: endCol - startCol + 1,
    data: result,
  };
}

// ─── 写入操作 ────────────────────────────────────────────────────

/**
 * 写入单个单元格
 * 返回 { xml: sheetXml, strings, ssUpdated }
 */
function writeCell(sheetXml, col, row, value, strings, styleIndex) {
  const ref = coordToRef(col, row);
  const rowNum = row + 1;

  // 检测值类型
  let type = detectValueType(value);
  let cellValue = value;

  if (type === "s") {
    // 文本需要存入 sharedStrings
    const result = findOrAddSharedString(strings, String(value));
    strings = result.strings;
    type = "s";
    cellValue = String(result.index);
  } else if (type === "n") {
    type = "n";
    cellValue = String(value);
  } else if (type === "b") {
    type = "b";
    cellValue = value ? "1" : "0";
  }

  const newCellXml = buildCellXml(ref, type, cellValue, styleIndex);

  // 查找现有行
  const rows = extractRows(sheetXml);
  let targetRow = null;
  for (const r of rows) {
    if (r.rowNum === rowNum) { targetRow = r; break; }
  }

  if (targetRow) {
    // 检查行中是否已有该单元格
    const cells = extractCells(targetRow.xml, targetRow.rowNum);
    let existingCell = null;
    for (const c of cells) {
      if (c.col === col) { existingCell = c; break; }
    }

    if (existingCell) {
      // 替换现有单元格（直接在 sheetXml 中用字符串替换）
      sheetXml = sheetXml.replace(existingCell.xml, newCellXml);
    } else {
      // 在 </row> 前插入新单元格
      const rowCloseIdx = sheetXml.indexOf("</row>", targetRow.start);
      if (rowCloseIdx !== -1) {
        sheetXml = sheetXml.substring(0, rowCloseIdx) + newCellXml + sheetXml.substring(rowCloseIdx);
      }
    }
  } else {
    // 需要创建新行
    const newRowXml = `<row r="${rowNum}">${newCellXml}</row>`;
    // 在 </sheetData> 前插入
    const sheetDataCloseIdx = sheetXml.indexOf("</sheetData>");
    if (sheetDataCloseIdx !== -1) {
      sheetXml = sheetXml.substring(0, sheetDataCloseIdx) + newRowXml + sheetXml.substring(sheetDataCloseIdx);
    } else {
      // 自闭合的 <sheetData/> 需要展开为 <sheetData>...</sheetData>
      sheetXml = sheetXml.replace(/<sheetData\s*\/>/, `<sheetData>${newRowXml}</sheetData>`);
    }
  }

  // 更新 dimension
  let maxCol = col, maxRow = row;
  const allRows = extractRows(sheetXml);
  for (const r of allRows) {
    const cells = extractCells(r.xml, r.rowNum);
    for (const c of cells) {
      if (c.col > maxCol) maxCol = c.col;
      if (c.row > maxRow) maxRow = c.row;
    }
  }
  sheetXml = updateDimension(sheetXml, maxCol, maxRow);

  return { xml: sheetXml, strings, ssUpdated: true };
}

/**
 * 批量写入（从指定位置开始的二维数组）
 */
function writeRange(sheetXml, startCol, startRow, dataArray, strings) {
  let currentXml = sheetXml;
  let currentStrings = strings;

  for (let r = 0; r < dataArray.length; r++) {
    const row = dataArray[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === null || row[c] === undefined) continue;
      const result = writeCell(currentXml, startCol + c, startRow + r, row[c], currentStrings);
      currentXml = result.xml;
      currentStrings = result.strings;
    }
  }

  return { xml: currentXml, strings: currentStrings };
}

/**
 * 重命名工作表
 * 在 workbook.xml 中修改对应 sheet 的 name 属性
 */
function renameSheet(workbookXml, sheetIndex, newName) {
  const sheetRe = /<sheet\b[^>]*>/g;
  let count = 0;
  return workbookXml.replace(sheetRe, (match) => {
    if (count === sheetIndex) {
      count++;
      return match.replace(/(\bname\s*=\s*)"[^"]*"/, `$1"${encodeXmlEntities(newName)}"`);
    }
    count++;
    return match;
  });
}

// ─── 合并单元格 ──────────────────────────────────────────────────

/**
 * 读取合并单元格区域列表
 * 返回 [{ref}] 如 [{ref:"A1:D1"}, {ref:"B2:B5"}]
 */
function readMergeCells(sheetXml) {
  const mergeMatch = sheetXml.match(/<mergeCells\b[^>]*>([\s\S]*?)<\/mergeCells>/);
  if (!mergeMatch) return [];

  const content = mergeMatch[1];
  const cells = [];
  const mcRe = /<mergeCell\b[^>]*ref="([^"]*)"[^>]*\/>/g;
  let m;
  while ((m = mcRe.exec(content)) !== null) {
    cells.push({ ref: m[1] });
  }
  return cells;
}

/**
 * 合并单元格
 * range 格式: "A1:D1"
 * 返回修改后的 sheetXml
 */
function mergeCells(sheetXml, range) {
  // 检查是否已存在相同合并区域
  const existing = readMergeCells(sheetXml);
  if (existing.some(mc => mc.ref === range)) {
    return sheetXml; // 已存在，无需重复
  }

  // 检查是否与现有合并区域重叠
  const rangeCoord = parseRange(range);
  if (!rangeCoord) return sheetXml;
  for (const mc of existing) {
    const mcCoord = parseRange(mc.ref);
    if (mcCoord && rangesOverlap(rangeCoord, mcCoord)) {
      // 先移除重叠的合并区域
      sheetXml = unmergeCells(sheetXml, mc.ref);
    }
  }

  const newMergeCell = `<mergeCell ref="${range}"/>`;

  if (/<mergeCells\b/.test(sheetXml)) {
    // 已有 mergeCells 段，追加
    sheetXml = sheetXml.replace(
      /(<mergeCells\b[^>]*>)([\s\S]*?)(<\/mergeCells>)/,
      (match, open, content, close) => {
        // 更新 count
        const countMatch = open.match(/count="(\d+)"/);
        const newCount = countMatch ? parseInt(countMatch[1], 10) + 1 : existing.length + 1;
        open = open.replace(/count="\d+"/, `count="${newCount}"`);
        return `${open}${content}${newMergeCell}${close}`;
      }
    );
  } else {
    // 需要创建 mergeCells 段，放在 </sheetData> 之后
    const mergeCellsXml = `<mergeCells count="1">${newMergeCell}</mergeCells>`;
    const sheetDataCloseIdx = sheetXml.indexOf("</sheetData>");
    if (sheetDataCloseIdx !== -1) {
      sheetXml = sheetXml.substring(0, sheetDataCloseIdx) + `</sheetData>${mergeCellsXml}` + sheetXml.substring(sheetDataCloseIdx + "</sheetData>".length);
    }
  }

  return sheetXml;
}

/**
 * 取消合并单元格
 * ref 可以是精确匹配的合并区域（如 "A1:D1"）或包含在该区域内的单元格（如 "A1"）
 * 返回修改后的 sheetXml
 */
function unmergeCells(sheetXml, ref) {
  const existing = readMergeCells(sheetXml);
  if (existing.length === 0) return sheetXml;

  // 查找要移除的合并区域
  let toRemove = null;
  // 先精确匹配
  toRemove = existing.find(mc => mc.ref === ref);

  // 如果不是精确匹配，检查 ref 是否是某个合并区域的单元格
  if (!toRemove) {
    const coord = refToCoord(ref);
    if (coord) {
      for (const mc of existing) {
        const mcRange = parseRange(mc.ref);
        if (mcRange &&
            coord.col >= mcRange.startCol && coord.col <= mcRange.endCol &&
            coord.row >= mcRange.startRow && coord.row <= mcRange.endRow) {
          toRemove = mc;
          break;
        }
      }
    }
  }

  if (!toRemove) return sheetXml;

  // 移除该 mergeCell
  sheetXml = sheetXml.replace(new RegExp(`<mergeCell\\b[^>]*ref="${escapeRegExp(toRemove.ref)}"[^>]*/>`), "");

  // 更新 count 或移除整个 mergeCells 段
  const remaining = readMergeCells(sheetXml);
  if (remaining.length === 0) {
    sheetXml = sheetXml.replace(/<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>/, "");
  } else {
    sheetXml = sheetXml.replace(
      /(<mergeCells\b[^>]*\bcount=")(\d+)(")/,
      `$1${remaining.length}$3`
    );
  }

  return sheetXml;
}

/**
 * 检查两个区域是否重叠
 */
function rangesOverlap(a, b) {
  return !(a.endCol < b.startCol || a.startCol > b.endCol ||
           a.endRow < b.startRow || a.startRow > b.endRow);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  listSheets,
  getSheetPath,
  getSheetInfo,
  readSheet,
  readCell,
  readRange,
  writeCell,
  writeRange,
  renameSheet,
  readMergeCells,
  mergeCells,
  unmergeCells,
};
