/**
 * 命令模块统一导出
 */

const memo = require("./memo");
const attachment = require("./attachment");
const user = require("./user");
const instance = require("./instance");

module.exports = {
  ...memo,
  ...attachment,
  ...user,
  ...instance,
};
