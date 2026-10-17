/**
 * 命令汇总入口
 */

const { cmdSearch } = require("./search");
const { cmdFetch } = require("./fetch");
const { cmdConfig } = require("./config");

module.exports = { cmdSearch, cmdFetch, cmdConfig };
