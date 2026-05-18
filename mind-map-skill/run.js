#!/usr/bin/env node
/**
 * 思维导图远程控制工具
 *
 * 用法:
 *   node skill.js <command> [args] [options]
 *
 * 命令:
 *   status              检查浏览器连接状态
 *   read                读取思维导图
 *   add <text>          添加子节点
 *   delete <uid>        删除节点
 *   update <uid> <text> 更新节点文本
 *   write <json-file>   从 JSON 文件覆盖整图
 *   config              显示当前配置
 */

const { SKILL_VERSION, loadDotEnv, initTls } = require("./lib/api");
const { cmdStatus, cmdRead, cmdAdd, cmdDelete, cmdUpdate, cmdWrite, cmdConfig } = require("./lib/commands");

loadDotEnv(__dirname);
initTls();

// ===================== CLI 解析 =====================

function parseOptions(args, startIndex) {
  const opts = {};
  const positional = [];
  let i = startIndex;
  while (i < args.length) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        opts[key] = args[i + 1];
        i += 2;
      } else {
        opts[key] = true;
        i++;
      }
    } else {
      positional.push(args[i]);
      i++;
    }
  }
  return { opts, positional };
}

function showHelp() {
  console.log(`
思维导图远程控制工具 v${SKILL_VERSION}

用法:
  node skill.js <command> [args] [options]

命令:
  status                       检查浏览器连接状态
  read                         读取思维导图
  add <text>                   添加子节点
  delete <uid>                 删除节点
  update <uid> <text>          更新节点文本
  write <json-file>            从 JSON 文件覆盖整图
  config                       显示当前配置

选项:
  --format <tree|json|summary>  读取格式（read 命令，默认 tree）
  --parent <uid>                父节点 UID（add 命令，默认根节点）
  --url <url>                   覆盖 API 服务器地址
  --token <t>                   覆盖 API Token
  -h, --help                    显示帮助
  -v, --version                 显示版本

示例:
  node skill.js status
  node skill.js read
  node skill.js read --format summary
  node skill.js add "新想法"
  node skill.js add "子项" --parent abc123
  node skill.js update abc123 "修改后的文本"
  node skill.js delete abc123
  node skill.js write /path/to/mindmap.json
  node skill.js config

环境变量:
  MIND_MAP_URL                  API 服务器地址（默认 http://localhost:8086）
  MIND_MAP_API_TOKEN            API Token（可选）
  MIND_MAP_REJECT_UNAUTHORIZED  HTTPS 证书验证（默认 false）
`);
}

// ===================== 命令分发 =====================

const COMMANDS = {
  status: { handler: (opts) => cmdStatus(opts), args: [], req: [] },
  read:   { handler: (opts) => cmdRead(opts), args: [], req: [] },
  add:    { handler: (opts, pos) => cmdAdd(pos[0], opts), args: ["text"], req: ["节点文本"] },
  delete: { handler: (opts, pos) => cmdDelete(pos[0], opts), args: ["uid"], req: ["节点 UID"] },
  update: { handler: (opts, pos) => cmdUpdate(pos[0], pos[1], opts), args: ["uid", "text"], req: ["节点 UID", "新文本"] },
  write:  { handler: (opts, pos) => cmdWrite(pos[0], opts), args: ["json-file"], req: ["JSON 文件路径"] },
  config: { handler: () => cmdConfig(), args: [], req: [] },
};

// ===================== 主入口 =====================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    showHelp();
    return;
  }

  if (args[0] === "-v" || args[0] === "--version") {
    console.log(`思维导图远程控制工具 v${SKILL_VERSION}`);
    return;
  }

  const command = args[0];
  const { opts, positional } = parseOptions(args, 1);
  const cmd = COMMANDS[command];

  if (!cmd) {
    console.log(JSON.stringify({ error: "未知命令", message: `不支持命令: ${command}，使用 --help 查看帮助` }, null, 2));
    return;
  }

  // 检查必需参数
  for (let i = 0; i < cmd.args.length; i++) {
    if (!positional[i]) {
      console.log(JSON.stringify({ error: "参数错误", message: `${command} 命令需要${cmd.req[i]}参数` }, null, 2));
      return;
    }
  }

  // 提取全局选项（url/token 不传给命令 handler）
  const overrides = {};
  if (opts.url) overrides.url = opts.url;
  if (opts.token) overrides.token = opts.token;

  // 合并选项：命令选项 + 全局覆盖
  const mergedOpts = { ...opts, ...overrides };

  const result = cmd.handler(mergedOpts, positional);
  console.log(JSON.stringify(await result, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: "程序错误", message: err.message }));
  process.exit(1);
});
