#!/usr/bin/env node
/**
 * Wiki.js GraphQL API 客户端
 *
 * 用法:
 *   node skill.js <command> [options...]
 *
 * 作者: Claude Code
 * 版本: 1.0.0
 */

const fetch = require("node-fetch");

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

// 从环境变量获取默认值
const DEFAULT_URL = process.env.WIKI_URL || "";
const DEFAULT_TOKEN = process.env.WIKI_TOKEN || "";

// 导入模块
const { parseArgs } = require("./lib/parser");
const { handleError } = require("./lib/errors");
const { cmdQuery, cmdCreate, cmdUpdate, cmdSearch, cmdHistory, cmdVersion, cmdCommentsList, cmdCommentsSingle, cmdCommentsCreate, cmdCommentsUpdate } = require("./lib/cmd");

/**
 * 显示帮助
 */
function showHelp() {
  console.log(`
Wiki.js GraphQL API 客户端 v${SKILL_VERSION}

用法:
  node skill.js <command> [options...]

命令:
  query <url> <token> <resource>     查询资源
  create <url> <token> <path> <title> <content>  创建页面
  update <url> <token> <page-id> <content> [options]  更新页面
  search <url> <token> <query>       搜索页面（默认带预览摘要）
  history <url> <token> <page-id>    页面历史记录
  version <url> <token> <page-id> <version-id>  获取特定版本内容
  comments <url> <token> <subcommand> [args...]  评论操作

查询资源类型:
  pages       查询所有页面
  page <id>   查询单个页面
  users       查询所有用户
  groups      查询所有用户组
  assets      查询所有资产

选项:
  --orderBy <field>    排序字段（查询页面）
  --limit <number>     限制结果数量
  --path <path>        页面路径（创建/更新/搜索）
  --title <title>      页面标题（更新）
  --editor <editor>    编辑器类型（markdown/ckeditor/api/code）
  --parentId <id>      父页面 ID（创建）
  --preview            显示内容预览摘要（节省 Token）
  --previewCount <n>   预览条数（默认 3）
  --contextLength <n>  摘要长度（默认 1=行模式）
  --page <n>          分页页码（历史记录）
  --limit <n>         每页条数（历史记录）
  --fullContent       获取完整内容（version 命令）
  --format <type>      输出格式（json/yaml/table/默认，默认yaml）
  --fields <list>      指定返回字段（逗号分隔）

示例:
  # 查询所有页面
  node skill.js query https://wiki.example.com TOKEN pages

  # 按标题排序查询
  node skill.js query https://wiki.example.com TOKEN pages --orderBy TITLE

  # 查询单个页面
  node skill.js query https://wiki.example.com TOKEN page 15

  # 创建页面
  node skill.js create https://wiki.example.com TOKEN "new/page" "新页面" "内容"

  # 更新页面
  node skill.js update https://wiki.example.com TOKEN 15 "新内容"

  # 搜索页面
  node skill.js search https://wiki.example.com TOKEN "关键词"

  # 搜索并显示内容预览（节省 Token）
  node skill.js search https://wiki.example.com TOKEN "关键词" --preview

  # 搜索并预览前 5 条，按行提取（1=上下各1行，共3行）
  node skill.js search https://wiki.example.com TOKEN "关键词" --preview --previewCount 5 --contextLength 1

  # 搜索并预览，按字符数提取（200字符）
  node skill.js search https://wiki.example.com TOKEN "关键词" --preview --contextLength 200

  # 查看页面历史
  node skill.js history https://wiki.example.com TOKEN 15

  # 查看页面历史（第2页）
  node skill.js history https://wiki.example.com TOKEN 15 --page 1 --limit 20

  # 查看页面历史（YAML 格式，省 Token）
  node skill.js history https://wiki.example.com TOKEN 15 --format yaml

  # 获取特定版本内容（预览）
  node skill.js version https://wiki.example.com TOKEN 15 5

  # 获取特定版本完整内容
  node skill.js version https://wiki.example.com TOKEN 15 5 --fullContent

  # 使用环境变量简化命令
  export WIKI_URL="https://wiki.example.com"
  export WIKI_TOKEN="your-token"
  node skill.js query pages
  node skill.js create "new/page" "标题" "内容"

快捷选项:
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息
`);
}

/**
 * 显示版本
 */
function showVersion() {
  console.log(`Wiki.js GraphQL API 客户端 v${SKILL_VERSION}`);
  console.log("GraphQL 端点: /graphql");
}

/**
 * 主函数
 */
function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));

  if (!positional[0] || positional[0] === "-h" || positional[0] === "--help") {
    showHelp();
    return;
  }

  if (positional[0] === "-v" || positional[0] === "--version") {
    showVersion();
    return;
  }

  const command = positional[0];

  // 确定 URL 和 Token
  let url = DEFAULT_URL;
  let token = DEFAULT_TOKEN;

  // 如果没有环境变量，从参数获取
  if (!url && positional[1]) {
    url = positional[1];
  }
  if (!token && positional[2]) {
    token = positional[2];
  }

  // 检查必需参数
  if (!url) {
    console.error("错误: 请提供 Wiki.js URL");
    console.error("可以通过以下方式提供:");
    console.error("  1. 命令参数: node skill.js query <url> <token> <resource>");
    console.error("  2. 环境变量: export WIKI_URL=https://wiki.example.com");
    process.exit(1);
  }

  if (!token) {
    console.error("错误: 请提供 API Token");
    console.error("可以通过以下方式提供:");
    console.error("  1. 命令参数: node skill.js query <url> <token> <resource>");
    console.error("  2. 环境变量: export WIKI_TOKEN=your-api-token");
    process.exit(1);
  }

  // 保存原始参数供子命令使用
  options.positional = positional;

  // 执行命令
  switch (command) {
    case "query":
      if (!positional[3]) {
        console.error("错误: 请指定要查询的资源类型");
        console.error("支持的资源: pages, page, users, groups, assets");
        process.exit(1);
      }
      // page 查询需要额外的 ID 参数
      const pageId = positional[3] === "page" ? positional[4] : null;
      cmdQuery(url, token, positional[3], options, pageId);
      break;

    case "create":
      if (!positional[3] || !positional[4] || !positional[5]) {
        console.error("错误: 创建页面需要提供路径、标题和内容");
        console.error("用法: node skill.js create <url> <token> <path> <title> <content>");
        process.exit(1);
      }
      cmdCreate(url, token, positional[3], positional[4], positional[5], options);
      break;

    case "update":
      if (!positional[3] || !positional[4]) {
        console.error("错误: 更新页面需要提供页面 ID 和新内容");
        console.error("用法: node skill.js update <url> <token> <page-id> <content>");
        process.exit(1);
      }
      cmdUpdate(url, token, positional[3], positional[4], options);
      break;

    case "search":
      if (!positional[3]) {
        console.error("错误: 搜索需要提供查询关键词");
        console.error("用法: node skill.js search <url> <token> <query>");
        process.exit(1);
      }
      cmdSearch(url, token, positional[3], options);
      break;

    case "history":
      if (!positional[3]) {
        console.error("错误: 查看历史需要提供页面 ID");
        console.error("用法: node skill.js history <url> <token> <page-id>");
        process.exit(1);
      }
      cmdHistory(url, token, positional[3], options);
      break;

    case "version":
      if (!positional[3] || !positional[4]) {
        console.error("错误: 获取版本需要提供页面 ID 和版本 ID");
        console.error("用法: node skill.js version <url> <token> <page-id> <version-id>");
        process.exit(1);
      }
      cmdVersion(url, token, positional[3], positional[4], options);
      break;

    case "comments":
      if (!positional[3]) {
        console.error("错误: 评论命令需要子命令");
        console.error("用法: node skill.js comments <url> <token> <subcommand> [args...]");
        console.error("子命令: list, single, create, update");
        process.exit(1);
      }
      const subCmd = positional[3];
      // 评论命令默认使用 yaml 格式
      if (!options.format) options.format = "yaml";

      switch (subCmd) {
        case "list":
          if (!positional[4] || !positional[5]) {
            console.error("错误: 查询评论列表需要 path 和 locale");
            console.error("用法: node skill.js comments <url> <token> list <path> <locale>");
            process.exit(1);
          }
          cmdCommentsList(url, token, positional[4], positional[5], options);
          break;

        case "single":
          if (!positional[4]) {
            console.error("错误: 查询单条评论需要评论 ID");
            console.error("用法: node skill.js comments <url> <token> single <comment-id>");
            process.exit(1);
          }
          cmdCommentsSingle(url, token, positional[4], options);
          break;

        case "create":
          if (!positional[4] || !positional[5]) {
            console.error("错误: 创建评论需要页面 ID 和内容");
            console.error("用法: node skill.js comments <url> <token> create <page-id> <content>");
            console.error("选项: --replyTo <id>, --guestName <name>, --guestEmail <email>");
            process.exit(1);
          }
          cmdCommentsCreate(url, token, positional[4], positional[5], options);
          break;

        case "update":
          if (!positional[4] || !positional[5]) {
            console.error("错误: 更新评论需要评论 ID 和新内容");
            console.error("用法: node skill.js comments <url> <token> update <comment-id> <content>");
            process.exit(1);
          }
          cmdCommentsUpdate(url, token, positional[4], positional[5], options);
          break;

        default:
          console.error(`错误: 未知评论子命令: ${subCmd}`);
          console.error("可用子命令: list, single, create, update");
          process.exit(1);
      }
      break;

    default:
      console.error(`错误: 未知命令: ${command}`);
      console.error("使用 --help 查看可用命令");
      process.exit(1);
  }
}

main();