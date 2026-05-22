/**
 * 操作模块统一导出
 */

const { XmlTextOps } = require("./text_ops");
const { XmlTableOps } = require("./table_ops");
const { ImageOps } = require("./image_ops");
const { HeaderFooterOps } = require("./header_footer_ops");
const { MetaOps } = require("./meta_ops");
const { StyleOps } = require("./style_ops");

// xlsx 模块
const { listSheets, getSheetPath, getSheetInfo, readSheet, readCell, readRange, writeCell, writeRange, renameSheet } = require("./sheet_ops");
const { parseSharedStrings, buildSharedStrings, refToCoord, coordToRef, parseRange } = require("./xlsx_utils");
const { readStylesOverview, readCellStyle, applyStyle } = require("./xlsx_style_ops");

module.exports = {
  // docx
  XmlTextOps, XmlTableOps, ImageOps, HeaderFooterOps, MetaOps, StyleOps,
  // xlsx
  listSheets, getSheetPath, getSheetInfo, readSheet, readCell, readRange, writeCell, writeRange, renameSheet,
  parseSharedStrings, buildSharedStrings, refToCoord, coordToRef, parseRange,
  readStylesOverview, readCellStyle, applyStyle,
};
