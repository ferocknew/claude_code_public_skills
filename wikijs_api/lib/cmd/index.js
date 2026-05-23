/**
 * 命令模块统一导出
 */

const { cmdQuery } = require("./query");
const { cmdCreate } = require("./create");
const { cmdUpdate } = require("./update");
const { cmdSearch } = require("./search_cmd");
const { cmdHistory } = require("./history");
const { cmdVersion } = require("./version");

module.exports = {
  cmdQuery,
  cmdCreate,
  cmdUpdate,
  cmdSearch,
  cmdHistory,
  cmdVersion
};