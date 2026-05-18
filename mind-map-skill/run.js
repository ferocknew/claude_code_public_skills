#!/usr/bin/env node
/**
 * 思维导图远程控制工具
 *
 * 用法:
 *   node skill.js <command> [args] [options]
 *
 * 命令:
 *   status                       检查浏览器连接状态
 *   read                         读取思维导图
 *   add <text>                   添加子节点
 *   delete <uid>                 删除节点
 *   update <uid> <text>          更新节点文本
 *   write <json-file>            从 JSON 文件覆盖整图
 *   move <uid> <targetUid>       移动节点到目标下
 *   up <uid>                     上移节点
 *   down <uid>                   下移节点
 *   insert <uid> <text>          插入同级节点
 *   insert-parent <uid> <text>   插入父级节点
 *   note <uid> <text>            设置节点备注
 *   link <uid> <url>             设置节点超链接
 *   undo                         撤销
 *   redo                         重做
 *   expand [uid]                 展开节点/全部
 *   collapse [uid]               收起节点/全部
 *   search <keyword>             搜索节点
 *   exec <command> [args-json]   执行任意 execCommand
 *   config                       显示当前配置
 */

const { SKILL_VERSION, loadDotEnv, initTls } = require("./lib/api");
const {
  cmdStatus, cmdRead, cmdAdd, cmdDelete, cmdUpdate, cmdWrite, cmdConfig,
  cmdExec, cmdMove, cmdUp, cmdDown, cmdInsert, cmdInsertParent,
  cmdNote, cmdLink, cmdUndo, cmdRedo, cmdExpand, cmdCollapse, cmdSearch,
} = require("./lib/commands");

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

基础命令:
  status                       检查浏览器连接状态
  read                         读取思维导图
  add <text>                   添加子节点
  delete <uid>                 删除节点
  update <uid> <text>          更新节点文本
  write <json-file>            从 JSON 文件覆盖整图
  config                       显示当前配置

节点操作:
  move <uid> <targetUid>       移动节点到目标节点下
  up <uid>                     上移节点（同级排序）
  down <uid>                   下移节点（同级排序）
  insert <uid> <text>          在指定节点旁插入同级节点
  insert-parent <uid> <text>   在指定节点上方插入父级节点

节点属性:
  note <uid> <text>            设置节点备注（空字符串清除）
  link <uid> <url>             设置节点超链接（空字符串清除）

历史操作:
  undo                         撤销上一步操作
  redo                         重做

视图控制:
  expand [uid]                 展开指定节点（无 uid 则展开全部）
  collapse [uid]               收起指定节点（无 uid 则收起全部）
  search <keyword>             按关键词搜索节点

高级:
  exec <command> [args-json]   执行任意 simple-mind-map execCommand

全局选项:
  --format <tree|json|summary>  读取格式（read 命令，默认 tree）
  --parent <uid>                父节点 UID（add 命令，默认根节点）
  --title <t>                   链接标题（link 命令）
  --step <n>                    撤销/重做步数（默认 1）
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
  node skill.js move abc123 def456
  node skill.js up abc123
  node skill.js insert abc123 "同级新节点"
  node skill.js note abc123 "这是备注内容"
  node skill.js link abc123 "https://example.com"
  node skill.js undo
  node skill.js expand abc123
  node skill.js collapse
  node skill.js search "关键词"
  node skill.js exec SET_NODE_TAG '{"uid":"abc123","tag":["重要"]}'

环境变量:
  MIND_MAP_URL                  API 服务器地址（默认 http://localhost:8086）
  MIND_MAP_API_TOKEN            API Token（可选）
  MIND_MAP_REJECT_UNAUTHORIZED  HTTPS 证书验证（默认 false）
`);
}

// ===================== 命令分发 =====================

const COMMANDS = {
  status:        { handler: (opts) => cmdStatus(opts), args: [], req: [] },
  read:          { handler: (opts) => cmdRead(opts), args: [], req: [] },
  add:           { handler: (opts, pos) => cmdAdd(pos[0], opts), args: ["text"], req: ["节点文本"] },
  delete:        { handler: (opts, pos) => cmdDelete(pos[0], opts), args: ["uid"], req: ["节点 UID"] },
  update:        { handler: (opts, pos) => cmdUpdate(pos[0], pos[1], opts), args: ["uid", "text"], req: ["节点 UID", "新文本"] },
  write:         { handler: (opts, pos) => cmdWrite(pos[0], opts), args: ["json-file"], req: ["JSON 文件路径"] },
  config:        { handler: () => cmdConfig(), args: [], req: [] },
  // 高级命令
  move:          { handler: (opts, pos) => cmdMove(pos[0], pos[1], opts), args: ["uid", "targetUid"], req: ["节点 UID", "目标节点 UID"] },
  up:            { handler: (opts, pos) => cmdUp(pos[0], opts), args: ["uid"], req: ["节点 UID"] },
  down:          { handler: (opts, pos) => cmdDown(pos[0], opts), args: ["uid"], req: ["节点 UID"] },
  insert:        { handler: (opts, pos) => cmdInsert(pos[0], pos[1], opts), args: ["uid", "text"], req: ["参考节点 UID", "新节点文本"] },
  "insert-parent": { handler: (opts, pos) => cmdInsertParent(pos[0], pos[1], opts), args: ["uid", "text"], req: ["子节点 UID", "新父节点文本"] },
  note:          { handler: (opts, pos) => cmdNote(pos[0], pos[1], opts), args: ["uid", "note"], req: ["节点 UID", "备注文本"] },
  link:          { handler: (opts, pos) => cmdLink(pos[0], pos[1], opts), args: ["uid", "url"], req: ["节点 UID", "URL"] },
  undo:          { handler: (opts) => cmdUndo(opts), args: [], req: [] },
  redo:          { handler: (opts) => cmdRedo(opts), args: [], req: [] },
  expand:        { handler: (opts, pos) => cmdExpand(pos[0] || null, opts), args: [], req: [] },
  collapse:      { handler: (opts, pos) => cmdCollapse(pos[0] || null, opts), args: [], req: [] },
  search:        { handler: (opts, pos) => cmdSearch(pos[0], opts), args: ["keyword"], req: ["搜索关键词"] },
  exec:          { handler: (opts, pos) => cmdExec(pos[0], pos[1], opts), args: ["command"], req: ["命令名"] },
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
