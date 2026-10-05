/**
 * 命令模块统一导出
 */

const { cmdExec } = require("./exec");
const { cmdShell } = require("./shell");
const { cmdSftp } = require("./sftp");
const { cmdTunnel } = require("./tunnel");
const { cmdKeygen } = require("./keygen");

module.exports = {
  cmdExec,
  cmdShell,
  cmdSftp,
  cmdTunnel,
  cmdKeygen,
};
