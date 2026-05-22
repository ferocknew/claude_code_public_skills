/**
 * xlsx_cli — xlsx 命令分发与实现
 */

const { DocxZip } = require("./docx_zip");
const { parseSharedStrings, buildSharedStrings, refToCoord, coordToRef, parseRange } = require("./xlsx_utils");
const { listSheets, getSheetPath, getSheetInfo, readSheet, readCell, readRange, writeCell, writeRange, renameSheet, readMergeCells, mergeCells, unmergeCells } = require("./sheet_ops");
const { readStylesOverview, readCellStyle, applyStyle } = require("./xlsx_style_ops");
const { MetaOps } = require("./meta_ops");

// ─── 输出工具 ────────────────────────────────────────────────────

function output(ok, command, data) {
  console.log(JSON.stringify({ ok, command, data }, null, 2));
}

function outputError(command, message) {
  console.log(JSON.stringify({ ok: false, command, error: message }, null, 2));
  process.exit(1);
}

function parseJson(str, command) {
  try { return JSON.parse(str); }
  catch (e) { outputError(command, `JSON 解析失败: ${e.message}`); }
}

// ─── xlsx 帮助信息 ───────────────────────────────────────────────

function showXlsxHelp(version) {
  console.log(`
XLSX 编辑工具 v${version}

用法: node skill.js <file.xlsx> <command> [arguments] [options]

只读命令:
  xlsx-info                          工作簿概览
  xlsx-sheet-list                    列出所有工作表
  xlsx-sheet-read <index>            读取整个工作表
  xlsx-cell-read <sheet> <ref>       读取单元格 (如 0 A1)
  xlsx-range-read <sheet> <range>    读取区域 (如 0 A1:C3)
  xlsx-style-read <sheet> <ref>      读取单元格样式
  meta-read                          读取文档属性

写入命令:
  xlsx-cell-write <sheet> <ref> <value>  写入单元格
  xlsx-range-write <sheet> <start> <json>  批量写入 (JSON 二维数组)
  xlsx-sheet-rename <index> <name>    重命名工作表
  xlsx-style-apply <sheet> <ref> '<json>'  修改单元格样式
  xlsx-cell-merge <sheet> <range>     合并单元格 (如 0 A1:D1)
  xlsx-cell-unmerge <sheet> <ref>     取消合并 (如 0 A1)
  meta-update '<json>'               修改文档属性

选项:
  -o, --output <path>                输出路径（默认覆盖原文件）
  --dry-run                          预览修改，不实际执行

示例:
  node skill.js file.xlsx xlsx-info
  node skill.js file.xlsx xlsx-sheet-list
  node skill.js file.xlsx xlsx-sheet-read 0
  node skill.js file.xlsx xlsx-cell-read 0 A1
  node skill.js file.xlsx xlsx-range-read 0 A1:C3
  node skill.js file.xlsx xlsx-cell-write 0 A1 "Hello"
  node skill.js file.xlsx xlsx-range-write 0 A1 '[["Name","Age"],["Tom",20]]'
  node skill.js file.xlsx xlsx-sheet-rename 0 "销售数据"
  node skill.js file.xlsx xlsx-style-apply 0 A1 '{"bold":true,"color":"FF0000"}'
  node skill.js file.xlsx xlsx-cell-merge 0 A1:D1
  node skill.js file.xlsx xlsx-cell-unmerge 0 A1
  node skill.js file.xlsx meta-read
`);
}

// ─── xlsx 命令分发 ───────────────────────────────────────────────

async function xlsxDispatch(args) {
  const filePath = args._[0];
  const command = args._[1];
  const p2 = args._[2];
  const p3 = args._[3];
  const p4 = args._[4];

  if (!filePath) outputError("none", "请指定 xlsx 文件路径");
  if (!command) outputError("none", "请指定命令。运行 node skill.js --help 查看帮助");

  const fs = require("fs");
  if (!fs.existsSync(filePath)) outputError(command, `文件不存在: ${filePath}`);

  const zip = await DocxZip.fromFile(filePath);
  const outputPath = args.output || filePath;

  switch (command) {
    case "xlsx-info": return cmdXlsxInfo(zip, command, outputPath);
    case "xlsx-sheet-list": return cmdXlsxSheetList(zip, command);
    case "xlsx-sheet-read": return cmdXlsxSheetRead(zip, command, p2);
    case "xlsx-cell-read": return cmdXlsxCellRead(zip, command, p2, p3);
    case "xlsx-range-read": return cmdXlsxRangeRead(zip, command, p2, p3);
    case "xlsx-cell-write": return cmdXlsxCellWrite(zip, command, p2, p3, p4, outputPath, args);
    case "xlsx-range-write": return cmdXlsxRangeWrite(zip, command, p2, p3, p4, outputPath, args);
    case "xlsx-sheet-rename": return cmdXlsxSheetRename(zip, command, p2, p3, outputPath, args);
    case "xlsx-style-read": return cmdXlsxStyleRead(zip, command, p2, p3);
    case "xlsx-style-apply": return cmdXlsxStyleApply(zip, command, p2, p3, p4, outputPath, args);
    case "xlsx-cell-merge": return cmdXlsxCellMerge(zip, command, p2, p3, outputPath, args);
    case "xlsx-cell-unmerge": return cmdXlsxCellUnmerge(zip, command, p2, p3, outputPath, args);
    case "meta-read": return cmdXlsxMetaRead(zip, command);
    case "meta-update": return cmdXlsxMetaUpdate(zip, command, p2, outputPath, args);
    default: outputError(command, `未知 xlsx 命令: ${command}`);
  }
}

// ─── 辅助函数 ────────────────────────────────────────────────────

async function loadWorkbook(zip, command) {
  const workbookXml = await zip.readXml("xl/workbook.xml");
  if (!workbookXml) outputError(command, "无法读取 xl/workbook.xml");

  const relsXml = await zip.readXml("xl/_rels/workbook.xml.rels");
  const sheets = listSheets(workbookXml, relsXml);

  return { workbookXml, relsXml, sheets };
}

async function loadSharedStrings(zip) {
  let ssXml = await zip.readXml("xl/sharedStrings.xml");
  if (!ssXml) return { strings: [], xml: null };
  return parseSharedStrings(ssXml);
}

function getSheetIndex(str, command) {
  if (str === undefined) outputError(command, "请指定工作表索引（从 0 开始）");
  const idx = parseInt(str, 10);
  if (isNaN(idx) || idx < 0) outputError(command, "工作表索引必须是非负整数");
  return idx;
}

// ─── 命令实现 ────────────────────────────────────────────────────

async function cmdXlsxInfo(zip, command, outputPath) {
  const { sheets } = await loadWorkbook(zip, command);
  const ss = await loadSharedStrings(zip);
  const stylesXml = await zip.readXml("xl/styles.xml");

  const sheetDetails = [];
  for (const sheet of sheets) {
    const sheetPath = getSheetPath(sheet);
    const sheetXml = await zip.readXml(sheetPath);
    const info = sheetXml ? getSheetInfo(sheetXml) : { totalRows: 0, totalCells: 0, maxColumn: 0, maxRow: 0 };
    const mergeCells = sheetXml ? readMergeCells(sheetXml) : [];
    sheetDetails.push({ name: sheet.name, index: sheet.index, ...info, mergeCells });
  }

  let meta = {};
  const coreXml = await zip.readXml("docProps/core.xml");
  if (coreXml) meta = MetaOps.read(coreXml);

  const stylesInfo = readStylesOverview(stylesXml);

  output(true, command, {
    sheets: sheets.length,
    sharedStrings: ss.strings.length,
    styles: stylesInfo,
    sheetDetails,
    meta,
  });
}

async function cmdXlsxSheetList(zip, command) {
  const { sheets } = await loadWorkbook(zip, command);
  output(true, command, { total: sheets.length, sheets: sheets.map(s => ({ index: s.index, name: s.name, sheetId: s.sheetId, target: s.target })) });
}

async function cmdXlsxSheetRead(zip, command, indexStr) {
  const idx = getSheetIndex(indexStr, command);
  const { sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在（共 ${sheets.length} 个）`);

  const sheetPath = getSheetPath(sheets[idx]);
  const sheetXml = await zip.readXml(sheetPath);
  if (!sheetXml) outputError(command, `无法读取 ${sheetPath}`);

  const ss = await loadSharedStrings(zip);
  const result = readSheet(sheetXml, ss.strings);
  output(true, command, { sheet: sheets[idx].name, index: idx, ...result });
}

async function cmdXlsxCellRead(zip, command, sheetStr, refStr) {
  const idx = getSheetIndex(sheetStr, command);
  if (!refStr) outputError(command, "请指定单元格引用（如 A1）");
  const coord = refToCoord(refStr);
  if (!coord) outputError(command, `无效的单元格引用: ${refStr}`);

  const { sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在`);

  const sheetPath = getSheetPath(sheets[idx]);
  const sheetXml = await zip.readXml(sheetPath);
  if (!sheetXml) outputError(command, `无法读取 ${sheetPath}`);

  const ss = await loadSharedStrings(zip);
  const cell = readCell(sheetXml, coord.col, coord.row, ss.strings);
  if (!cell) {
    output(true, command, { sheet: sheets[idx].name, ref: refStr, value: null, type: "empty" });
  } else {
    output(true, command, { sheet: sheets[idx].name, ...cell });
  }
}

async function cmdXlsxRangeRead(zip, command, sheetStr, rangeStr) {
  const idx = getSheetIndex(sheetStr, command);
  if (!rangeStr) outputError(command, "请指定区域引用（如 A1:C3）");
  const range = parseRange(rangeStr);
  if (!range) outputError(command, `无效的区域引用: ${rangeStr}`);

  const { sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在`);

  const sheetPath = getSheetPath(sheets[idx]);
  const sheetXml = await zip.readXml(sheetPath);
  if (!sheetXml) outputError(command, `无法读取 ${sheetPath}`);

  const ss = await loadSharedStrings(zip);
  const result = readRange(sheetXml, range.startCol, range.startRow, range.endCol, range.endRow, ss.strings);
  output(true, command, { sheet: sheets[idx].name, index: idx, ...result });
}

async function cmdXlsxCellWrite(zip, command, sheetStr, refStr, valueStr, outputPath, args) {
  const idx = getSheetIndex(sheetStr, command);
  if (!refStr) outputError(command, "请指定单元格引用（如 A1）");
  const coord = refToCoord(refStr);
  if (!coord) outputError(command, `无效的单元格引用: ${refStr}`);
  if (valueStr === undefined) outputError(command, "请指定要写入的值");

  // 尝试解析 JSON 值，否则作为字符串
  let value;
  try {
    value = JSON.parse(valueStr);
  } catch (e) {
    value = valueStr;
  }

  const { sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在`);

  const sheetPath = getSheetPath(sheets[idx]);
  let sheetXml = await zip.readXml(sheetPath);
  if (!sheetXml) outputError(command, `无法读取 ${sheetPath}`);

  const ss = await loadSharedStrings(zip);
  const result = writeCell(sheetXml, coord.col, coord.row, value, ss.strings);

  if (!args.dryRun) {
    // 写回 sheet
    await zip.writeXml(sheetPath, result.xml);
    // 写回 sharedStrings
    if (result.ssUpdated) {
      const ssXml = buildSharedStrings(result.strings);
      await zip.writeXml("xl/sharedStrings.xml", ssXml);
    }
    await zip.save(outputPath);
  }

  output(true, command, {
    sheet: sheets[idx].name, index: idx, ref: refStr,
    value, dryRun: !!args.dryRun,
    outputPath: args.dryRun ? null : outputPath,
  });
}

async function cmdXlsxRangeWrite(zip, command, sheetStr, startRefStr, jsonStr, outputPath, args) {
  const idx = getSheetIndex(sheetStr, command);
  if (!startRefStr) outputError(command, "请指定起始单元格引用（如 A1）");
  const coord = refToCoord(startRefStr);
  if (!coord) outputError(command, `无效的单元格引用: ${startRefStr}`);
  if (!jsonStr) outputError(command, "请指定 JSON 二维数组");

  const dataArray = parseJson(jsonStr, command);
  if (!Array.isArray(dataArray)) outputError(command, "参数必须是二维数组");

  const { sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在`);

  const sheetPath = getSheetPath(sheets[idx]);
  let sheetXml = await zip.readXml(sheetPath);
  if (!sheetXml) outputError(command, `无法读取 ${sheetPath}`);

  const ss = await loadSharedStrings(zip);
  const result = writeRange(sheetXml, coord.col, coord.row, dataArray, ss.strings);

  if (!args.dryRun) {
    await zip.writeXml(sheetPath, result.xml);
    if (result.strings.length > 0) {
      const ssXml = buildSharedStrings(result.strings);
      await zip.writeXml("xl/sharedStrings.xml", ssXml);
    }
    await zip.save(outputPath);
  }

  output(true, command, {
    sheet: sheets[idx].name, index: idx, startRef: startRefStr,
    rows: dataArray.length, cols: dataArray[0]?.length || 0,
    dryRun: !!args.dryRun,
    outputPath: args.dryRun ? null : outputPath,
  });
}

async function cmdXlsxSheetRename(zip, command, indexStr, newName, outputPath, args) {
  const idx = getSheetIndex(indexStr, command);
  if (!newName) outputError(command, "请指定新的工作表名称");

  const { workbookXml, sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在`);

  const oldName = sheets[idx].name;
  const newWorkbookXml = renameSheet(workbookXml, idx, newName);

  if (!args.dryRun) {
    await zip.writeXml("xl/workbook.xml", newWorkbookXml);
    await zip.save(outputPath);
  }

  output(true, command, {
    index: idx, oldName, newName,
    dryRun: !!args.dryRun,
    outputPath: args.dryRun ? null : outputPath,
  });
}

async function cmdXlsxStyleRead(zip, command, sheetStr, refStr) {
  const idx = getSheetIndex(sheetStr, command);
  if (!refStr) outputError(command, "请指定单元格引用（如 A1）");
  const coord = refToCoord(refStr);
  if (!coord) outputError(command, `无效的单元格引用: ${refStr}`);

  const { sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在`);

  const sheetPath = getSheetPath(sheets[idx]);
  const sheetXml = await zip.readXml(sheetPath);
  if (!sheetXml) outputError(command, `无法读取 ${sheetPath}`);

  const stylesXml = await zip.readXml("xl/styles.xml");

  // 找到单元格的样式索引
  const { extractRows, extractCells } = require("./xlsx_utils");
  const rows = extractRows(sheetXml);
  let cellXfIndex = 0;
  let found = false;

  for (const row of rows) {
    if (row.rowNum !== coord.row + 1) continue;
    const cells = extractCells(row.xml, row.rowNum);
    for (const cell of cells) {
      if (cell.col === coord.col && cell.row === coord.row) {
        const sMatch = cell.xml.match(/\bs\s*=\s*"(\d+)"/);
        cellXfIndex = sMatch ? parseInt(sMatch[1], 10) : 0;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  const styleDetail = stylesXml ? readCellStyle(stylesXml, cellXfIndex) : null;

  output(true, command, {
    sheet: sheets[idx].name, ref: refStr, cellFound: found,
    xfIndex: cellXfIndex, style: styleDetail,
  });
}

async function cmdXlsxStyleApply(zip, command, sheetStr, refStr, jsonStr, outputPath, args) {
  const idx = getSheetIndex(sheetStr, command);
  if (!refStr) outputError(command, "请指定单元格引用（如 A1）");
  const coord = refToCoord(refStr);
  if (!coord) outputError(command, `无效的单元格引用: ${refStr}`);
  if (!jsonStr) outputError(command, "请指定样式参数 JSON");

  const styleChanges = parseJson(jsonStr, command);

  const { sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在`);

  const sheetPath = getSheetPath(sheets[idx]);
  let sheetXml = await zip.readXml(sheetPath);
  if (!sheetXml) outputError(command, `无法读取 ${sheetPath}`);

  let stylesXml = await zip.readXml("xl/styles.xml");

  // 获取当前单元格的 xfIndex
  const { extractRows, extractCells, getXmlAttr } = require("./xlsx_utils");
  const rows = extractRows(sheetXml);
  let currentXfIndex = 0;
  let cellFound = false;

  for (const row of rows) {
    if (row.rowNum !== coord.row + 1) continue;
    const cells = extractCells(row.xml, row.rowNum);
    for (const cell of cells) {
      if (cell.col === coord.col && cell.row === coord.row) {
        const sMatch = cell.xml.match(/\bs\s*=\s*"(\d+)"/);
        currentXfIndex = sMatch ? parseInt(sMatch[1], 10) : 0;
        cellFound = true;
        break;
      }
    }
    if (cellFound) break;
  }

  if (!cellFound) outputError(command, `单元格 ${refStr} 不存在，请先写入数据`);

  // 应用样式
  const styleResult = applyStyle(stylesXml, currentXfIndex, styleChanges);

  // 更新单元格的 s 属性
  // 重新查找单元格并更新 s 属性
  const newSheetRows = extractRows(sheetXml);
  for (const row of newSheetRows) {
    if (row.rowNum !== coord.row + 1) continue;
    const cells = extractCells(row.xml, row.rowNum);
    for (const cell of cells) {
      if (cell.col === coord.col && cell.row === coord.row) {
        // 更新 s 属性
        if (/\bs\s*=\s*"\d+"/.test(cell.xml)) {
          sheetXml = sheetXml.replace(
            cell.xml,
            cell.xml.replace(/\bs\s*=\s*"\d+"/, `s="${styleResult.xfIndex}"`)
          );
        } else {
          // 添加 s 属性
          sheetXml = sheetXml.replace(
            cell.xml,
            cell.xml.replace(/<c r="/, `<c s="${styleResult.xfIndex}" r="`)
          );
        }
        break;
      }
    }
    break;
  }

  if (!args.dryRun) {
    await zip.writeXml(sheetPath, sheetXml);
    await zip.writeXml("xl/styles.xml", styleResult.stylesXml);
    await zip.save(outputPath);
  }

  output(true, command, {
    sheet: sheets[idx].name, ref: refStr,
    xfIndex: styleResult.xfIndex, styleChanges,
    dryRun: !!args.dryRun,
    outputPath: args.dryRun ? null : outputPath,
  });
}

async function cmdXlsxMetaRead(zip, command) {
  const coreXml = await zip.readXml("docProps/core.xml");
  if (!coreXml) outputError(command, "无法读取 docProps/core.xml");

  const meta = MetaOps.read(coreXml);
  const appXml = await zip.readXml("docProps/app.xml");
  const appMeta = appXml ? MetaOps.readApp(appXml) : {};

  output(true, command, { core: meta, app: appMeta });
}

async function cmdXlsxMetaUpdate(zip, command, jsonStr, outputPath, args) {
  if (!jsonStr) outputError(command, '请指定修改参数，格式: \'{"dc:title":"新标题"}\' ');
  const updates = parseJson(jsonStr, command);

  const coreXml = await zip.readXml("docProps/core.xml");
  if (!coreXml) outputError(command, "无法读取 docProps/core.xml");

  const result = MetaOps.update(coreXml, updates, args.dryRun);
  if (!args.dryRun && Object.keys(result.updated).length > 0) {
    await zip.writeXml("docProps/core.xml", result.xml);
    await zip.save(outputPath);
  }
  output(true, command, { updated: result.updated, dryRun: !!args.dryRun, outputPath: args.dryRun ? null : outputPath });
}

async function cmdXlsxCellMerge(zip, command, sheetStr, rangeStr, outputPath, args) {
  const idx = getSheetIndex(sheetStr, command);
  if (!rangeStr) outputError(command, "请指定合并区域（如 A1:D1）");
  const range = parseRange(rangeStr);
  if (!range) outputError(command, `无效的区域引用: ${rangeStr}`);

  const { sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在`);

  const sheetPath = getSheetPath(sheets[idx]);
  let sheetXml = await zip.readXml(sheetPath);
  if (!sheetXml) outputError(command, `无法读取 ${sheetPath}`);

  sheetXml = mergeCells(sheetXml, rangeStr);

  if (!args.dryRun) {
    await zip.writeXml(sheetPath, sheetXml);
    await zip.save(outputPath);
  }

  output(true, command, {
    sheet: sheets[idx].name, index: idx, range: rangeStr,
    dryRun: !!args.dryRun,
    outputPath: args.dryRun ? null : outputPath,
  });
}

async function cmdXlsxCellUnmerge(zip, command, sheetStr, refStr, outputPath, args) {
  const idx = getSheetIndex(sheetStr, command);
  if (!refStr) outputError(command, "请指定单元格或区域引用（如 A1 或 A1:D1）");

  const { sheets } = await loadWorkbook(zip, command);
  if (idx >= sheets.length) outputError(command, `工作表索引 ${idx} 不存在`);

  const sheetPath = getSheetPath(sheets[idx]);
  let sheetXml = await zip.readXml(sheetPath);
  if (!sheetXml) outputError(command, `无法读取 ${sheetPath}`);

  sheetXml = unmergeCells(sheetXml, refStr);

  if (!args.dryRun) {
    await zip.writeXml(sheetPath, sheetXml);
    await zip.save(outputPath);
  }

  output(true, command, {
    sheet: sheets[idx].name, index: idx, ref: refStr,
    dryRun: !!args.dryRun,
    outputPath: args.dryRun ? null : outputPath,
  });
}

module.exports = { xlsxDispatch, showXlsxHelp };
