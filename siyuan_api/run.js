#!/usr/bin/env node
/**
 * 思源笔记 REST API 客户端
 *
 * 用法:
 *   node skill.js <command> [subcommand] [args...] [options]
 *
 * 作者: Claude Code
 * 版本: 0.0.1
 */

const fetch = globalThis.fetch;

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "0.0.1-dev";

// 导入模块
const { parseArgs } = require("./lib/parser");
const { handleError } = require("./lib/errors");
const { resolve: resolveEnv } = require("./lib/env");
const {
  cmdNotebook,
  cmdDoc,
  cmdBlock,
  cmdAttr,
  cmdSql,
  cmdFile,
  cmdExport,
  cmdSystem
} = require("./lib/cmd");

/**
 * 显示帮助
 */
function showHelp() {
  console.log(`
思源笔记 REST API 工具 v${SKILL_VERSION}

用法:
  node skill.js <command> [subcommand] [args...] [options]

命令:
  notebook <subcommand>          笔记本操作
  doc <subcommand>               文档路径查询
  block <subcommand>             块查询
  attr <subcommand>              属性查询
  sql <stmt>                     SQL 查询
  file <subcommand>              文件操作
  export <subcommand>            导出
  system <subcommand>            系统信息

笔记本子命令:
  ls                             列出所有笔记本
  create <name>                  创建笔记本
  open <id>                      打开笔记本
  close <id>                     关闭笔记本
  conf <id>                      获取笔记本配置

文档子命令:
  create --notebook <id> --path <path> <markdown>  创建文档
  remove <id>                    删除文档
  rename <id> --title <title>    重命名文档
  hpath --notebook <id> --path <path>   通过存储路径获取人类可读路径
  hpath-by-id <id>                      通过块 ID 获取人类可读路径
  path-by-id <id>                       通过块 ID 获取存储路径
  ids-by-hpath --notebook <id> --path <hpath>  通过人类可读路径获取 ID

块子命令:
  kramdown <id>                  获取块的 Kramdown 内容
  children <id>                  获取子块列表
  insert <md> --parentID <id>    插入块（也可用 --nextID / --previousID）
  prepend <md> --parentID <id>   前置插入子块
  append <md> --parentID <id>    后置插入子块
  update <id> <md>               更新块内容
  delete <id>                    删除块
  move <id> --previousID <id>    移动块（或 --parentID）

属性子命令:
  get <id>                       获取块属性
  set <id> '<json-attrs>'        设置块属性

文件子命令:
  get <path>                     获取文件内容
  ls <path>                      列出目录内容

导出子命令:
  md <id>                        导出文档为 Markdown

系统子命令:
  version                        获取思源笔记版本
  time                           获取服务器时间
  boot                           获取启动进度

选项:
  --format <type>                输出格式（json/yaml/table/default）
  --notebook <id>                笔记本 ID
  --path <path>                  路径

环境变量:
  SIYUAN_URL                     思源笔记地址（默认 http://127.0.0.1:6806）
  SIYUAN_API_TOKEN                API Token（设置 > 关于 中获取）

示例:
  # 查看系统版本
  node skill.js system version

  # 列出笔记本
  node skill.js notebook ls

  # SQL 查询
  node skill.js sql "SELECT * FROM blocks WHERE type=\\'d\\' LIMIT 10"

  # 导出文档为 Markdown
  node skill.js export md 20231230123456-abcdef

  # 获取块属性
  node skill.js attr get 20231230123456-abcdef

  # 获取块的 Kramdown 内容
  node skill.js block kramdown 20231230123456-abcdef

  # 使用环境变量简化命令
  export SIYUAN_URL="http://127.0.0.1:6806"
  export SIYUAN_API_TOKEN="your-token"
  node skill.js notebook ls
  node skill.js sql "SELECT * FROM blocks LIMIT 5"

快捷选项:
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息
`);
}

/**
 * 显示版本
 */
function showVersion() {
  console.log(`思源笔记 REST API 工具 v${SKILL_VERSION}`);
  console.log("默认端点: http://127.0.0.1:6806");
}

/**
 * 主函数
 */
function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));

  // 检查版本标志（-v/--version 可能被解析器归入 options）
  if (options.v || options.version) {
    showVersion();
    return;
  }

  // 检查帮助标志
  if (!positional[0] || options.h || options.help) {
    showHelp();
    return;
  }

  const command = positional[0];

  // 解析环境配置：加载 .env + 从 positional 中剥离 URL/Token
  const { url, token, args } = resolveEnv(positional.slice(1));

  // 检查必需参数
  if (!url) {
    console.error("错误: 请提供思源笔记服务地址");
    console.error("可以通过以下方式提供:");
    console.error("  1. 命令参数: node skill.js notebook ls <url> <token>");
    console.error("  2. 环境变量: export SIYUAN_URL=http://127.0.0.1:6806");
    console.error("  3. 同目录 .env 文件: SIYUAN_URL=http://127.0.0.1:6806");
    process.exit(1);
  }

  if (!token) {
    console.error("错误: 请提供 API Token");
    console.error("可以通过以下方式提供:");
    console.error("  1. 命令参数: node skill.js notebook ls <url> <token>");
    console.error("  2. 环境变量: export SIYUAN_API_TOKEN=your-token");
    console.error("  3. 同目录 .env 文件: SIYUAN_API_TOKEN=your-token");
    console.error("\n💡 Token 获取路径: 思源笔记 > 设置 > 关于 > API Token");
    process.exit(1);
  }

  // 执行命令
  switch (command) {
    case "notebook":
    case "nb":
      if (!args[0]) {
        console.error("错误: 请指定笔记本子命令");
        console.error("用法: node skill.js notebook <ls|create|open|close|conf> [args...]");
        process.exit(1);
      }
      cmdNotebook(url, token, args[0], args.slice(1), options);
      break;

    case "doc":
      if (!args[0]) {
        console.error("错误: 请指定文档子命令");
        console.error("用法: node skill.js doc <create|remove|rename|hpath|hpath-by-id|path-by-id|ids-by-hpath> [args...]");
        process.exit(1);
      }
      cmdDoc(url, token, args[0], args.slice(1), options);
      break;

    case "block":
      if (!args[0]) {
        console.error("错误: 请指定块子命令");
        console.error("用法: node skill.js block <kramdown|children|insert|prepend|append|update|delete|move> [args...]");
        process.exit(1);
      }
      cmdBlock(url, token, args[0], args.slice(1), options);
      break;

    case "attr":
      if (!args[0]) {
        console.error("错误: 请指定属性子命令");
        console.error("用法: node skill.js attr <get|set> <id> [args...]");
        process.exit(1);
      }
      cmdAttr(url, token, args[0], args.slice(1), options);
      break;

    case "sql":
    case "query":
      if (!args[0]) {
        console.error("错误: 请提供 SQL 语句");
        console.error("用法: node skill.js sql \"SELECT * FROM blocks LIMIT 10\"");
        process.exit(1);
      }
      cmdSql(url, token, args[0], options);
      break;

    case "file":
      if (!args[0]) {
        console.error("错误: 请指定文件子命令");
        console.error("用法: node skill.js file <get|ls> <path>");
        process.exit(1);
      }
      cmdFile(url, token, args[0], args.slice(1), options);
      break;

    case "export":
      if (!args[0]) {
        console.error("错误: 请指定导出子命令");
        console.error("用法: node skill.js export <md> <id>");
        process.exit(1);
      }
      cmdExport(url, token, args[0], args.slice(1), options);
      break;

    case "system":
    case "sys":
      if (!args[0]) {
        console.error("错误: 请指定系统子命令");
        console.error("用法: node skill.js system <version|time|boot>");
        process.exit(1);
      }
      cmdSystem(url, token, args[0], args.slice(1), options);
      break;

    default:
      console.error(`错误: 未知命令: ${command}`);
      console.error("使用 --help 查看可用命令");
      process.exit(1);
  }
}

main();
