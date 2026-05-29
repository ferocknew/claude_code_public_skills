/**
 * 命令模块统一导出
 */

const { cmdNotebook } = require("./notebook");
const { cmdDoc } = require("./doc");
const { cmdBlock } = require("./block");
const { cmdAttr } = require("./attr");
const { cmdSql } = require("./sql");
const { cmdFile } = require("./file");
const { cmdExport } = require("./export");
const { cmdSystem } = require("./system");

module.exports = {
  cmdNotebook,
  cmdDoc,
  cmdBlock,
  cmdAttr,
  cmdSql,
  cmdFile,
  cmdExport,
  cmdSystem
};
