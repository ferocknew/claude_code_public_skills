/**
 * 命令模块统一导出
 */

const memory = require("./memory");
const mentalModel = require("./mental_model");
const meta = require("./meta");

module.exports = {
  ...memory,
  ...mentalModel,
  ...meta,
};
