#!/usr/bin/env node
/**
 * SSH 客户端工具（基于 ssh2）
 *
 * 用法:
 *   node skill.js <command> [args...] [options]
 *
 * 命令:
 *   exec     执行单条远程命令
 *   shell    在同一连接上执行多条命令
 *   sftp     文件传输与远程文件操作（put/get/ls/mkdir/rm/stat）
 *   tunnel   端口转发（本地端口 -> 远程可达目标）
 *   keygen   生成本地 SSH 密钥对
 *
 * 本工具将依赖打包为单文件，无需 npm install。
 */

// 版本号（打包时通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "0.0.1-dev";

const { parseArgs } = require("./lib/parser");
const { handleError } = require("./lib/errors");
const { cmdExec, cmdShell, cmdSftp, cmdTunnel, cmdKeygen } = require("./lib/cmd");

/**
 * 显示帮助
 */
function showHelp() {
  console.log(`
SSH 客户端工具 v${SKILL_VERSION}

用法:
  node skill.js <command> [args...] [options]

命令:
  exec <command>                          执行单条远程命令
  shell <cmd1> [cmd2] ...                 同一连接执行多条命令
  sftp <put|get|ls|mkdir|rm|stat> ...     文件传输与远程文件操作
  tunnel --local <端口> --remote-host <h> --remote-port <p>
                                          建立端口转发隧道
  keygen [--type ed25519] [--out <路径>]  生成本地密钥对

SSH 连接参数（--ssh，逗号分隔，所有命令通用）:
  host:<地址>          主机地址（必需）
  user:<用户名>        用户名（必需）
  port:<端口>          SSH 端口（默认 22）
  password:<密码>      密码认证
  key:<私钥路径>       私钥认证
  passphrase:<口令>    私钥口令（加密私钥必需）
  timeout:<毫秒>       连接超时（默认 20000）
  trykeyboardinteractive   启用 keyboard-interactive 认证

通用选项:
  --cwd <目录>         执行前切换到该远程目录（exec/shell）
  --pty                分配伪终端（screen/tmux/sudo 等需要）
  --timeout <毫秒>     命令执行超时
  -h, --help           显示帮助
  -v, --version        显示版本

exec 示例:
  node skill.js exec "uname -a" --ssh host:1.2.3.4,user:root,password:xxx
  node skill.js exec "df -h" --ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519
  node skill.js exec "sudo systemctl status nginx" --pty --ssh host:1.2.3.4,user:root,password:xxx
  node skill.js exec "ls -la" --cwd /var/log --ssh host:1.2.3.4,user:root,password:xxx

shell 示例:
  node skill.js shell "cd /app && git pull" "npm install" "pm2 reload app" --ssh host:1.2.3.4,user:deploy,key:~/.ssh/deploy
  node skill.js shell "false" "echo still-runs" --keep-going --ssh host:1.2.3.4,user:root,password:xxx

sftp 示例:
  node skill.js sftp put ./dist /var/www/html --ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519
  node skill.js sftp get /var/log/app.log ./app.log --ssh host:1.2.3.4,user:root,password:xxx
  node skill.js sftp ls /var/log --ssh host:1.2.3.4,user:root,password:xxx
  node skill.js sftp mkdir /data/backup --ssh host:1.2.3.4,user:root,password:xxx
  node skill.js sftp stat /etc/nginx/nginx.conf --ssh host:1.2.3.4,user:root,password:xxx

tunnel 示例:
  # 通过跳板机访问内网 MySQL（本地 13306 -> 192.0.2.10:3306）
  node skill.js tunnel --local 13306 --remote-host 192.0.2.10 --remote-port 3306 \\
    --ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519

keygen 示例:
  node skill.js keygen --type ed25519 --out ~/.ssh/deploy_key --comment "deploy"
  node skill.js keygen --type rsa --bits 4096 --passphrase mypass

环境变量（作为 --ssh 的默认值）:
  SSH_HOST, SSH_USER, SSH_PORT, SSH_PASSWORD, SSH_KEY, SSH_PASSPHRASE, SSH_TIMEOUT

输出:
  所有命令输出 JSON 到 stdout，错误输出 JSON 到 stderr，便于程序与 LLM 解析。
`);
}

/**
 * 显示版本
 */
function showVersion() {
  console.log(`SSH 客户端工具 v${SKILL_VERSION}`);
  console.log("基于 ssh2（零依赖打包）");
}

/**
 * 主函数
 */
function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));

  if (options.v || options.version) {
    showVersion();
    return;
  }

  if (positional.length === 0 || options.h || options.help) {
    showHelp();
    return;
  }

  const command = positional[0].toLowerCase();
  const args = positional.slice(1);

  const wrap = (fn) => {
    Promise.resolve()
      .then(() => fn(args, options))
      .catch((e) => handleError(e, `${command} 执行失败`));
  };

  switch (command) {
    case "exec":
    case "run":
      wrap(cmdExec);
      break;

    case "shell":
    case "script":
      wrap(cmdShell);
      break;

    case "sftp":
    case "file":
      wrap(cmdSftp);
      break;

    case "tunnel":
    case "forward":
      wrap(cmdTunnel);
      break;

    case "keygen":
      wrap(cmdKeygen);
      break;

    default:
      handleError(new Error(`未知命令: ${command}`), "使用 --help 查看可用命令", 2);
  }
}

main();
