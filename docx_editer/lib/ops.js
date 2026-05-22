/**
 * 操作模块统一导出
 */

const { XmlTextOps } = require("./text_ops");
const { XmlTableOps } = require("./table_ops");
const { ImageOps } = require("./image_ops");
const { HeaderFooterOps } = require("./header_footer_ops");
const { MetaOps } = require("./meta_ops");
const { StyleOps } = require("./style_ops");

module.exports = { XmlTextOps, XmlTableOps, ImageOps, HeaderFooterOps, MetaOps, StyleOps };
