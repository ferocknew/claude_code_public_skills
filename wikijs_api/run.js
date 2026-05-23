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

// GraphQL 端点
const GRAPHQL_ENDPOINT = "/graphql";

// 显示帮助
function showHelp() {
  console.log(`
Wiki.js GraphQL API 客户端 v${SKILL_VERSION}

用法:
  node skill.js <command> [options...]

命令:
  query <url> <token> <resource>     查询资源
  create <url> <token> <path> <title> <content>  创建页面
  update <url> <token> <page-id> <content> [options]  更新页面
  delete <url> <token> <page-id>     删除页面
  search <url> <token> <query>       搜索页面

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
  --contentType <type> 内容类型（markdown/html/json）
  --editor <editor>    编辑器类型（markdown/ckeditor/api/code）
  --parentId <id>      父页面 ID（创建）
  --folderId <id>      文件夹 ID（查询资产）
  --search <query>     搜索关键词（查询用户）
  --format <type>      输出格式（json/table）

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

  # 删除页面
  node skill.js delete https://wiki.example.com TOKEN 15

  # 搜索页面
  node skill.js search https://wiki.example.com TOKEN "关键词"

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

// 显示版本
function showVersion() {
  console.log(`Wiki.js GraphQL API 客户端 v${SKILL_VERSION}`);
  console.log("GraphQL 端点: /graphql");
}

// 解析命令行参数
function parseArgs(args) {
  const options = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        options[key] = value;
        i++;
      } else {
        options[key] = true;
      }
    } else if (args[i].startsWith("-")) {
      options[args[i].slice(1)] = true;
    } else {
      positional.push(args[i]);
    }
  }

  return { positional, options };
}

// 执行 GraphQL 查询
async function graphqlQuery(url, token, query, variables = {}) {
  const endpoint = url.replace(/\/$/, "") + GRAPHQL_ENDPOINT;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL 错误: ${result.errors[0].message}`);
  }

  return result.data;
}

// 格式化输出
function formatOutput(data, format = "json") {
  if (format === "json") {
    console.log(JSON.stringify(data, null, 2));
  } else if (format === "table") {
    console.table(data);
  } else {
    console.log(data);
  }
}

// 错误处理
function handleError(error, context = "") {
  console.error(`❌ 错误: ${context}`);
  console.error(error.message);

  // 检查常见错误代码
  if (error.message.includes("401") || error.message.includes("403")) {
    console.error("\n💡 提示: 请检查 API Token 是否正确且有足够的权限");
  } else if (error.message.includes("404")) {
    console.error("\n💡 提示: 请检查 Wiki.js URL 是否正确");
  } else if (error.message.includes("ECONNREFUSED")) {
    console.error("\n💡 提示: 无法连接到 Wiki.js 服务器");
  }

  process.exit(1);
}

// 查询命令
async function cmdQuery(url, token, resource, options) {
  let query = "";
  let dataPath = "";

  switch (resource) {
    case "pages":
      query = `{
        pages {
          list ${options.orderBy ? `(orderBy: ${options.orderBy})` : ""} {
            id
            path
            title
            description
            contentType
            locale
            createdAt
            updatedAt
          }
        }
      }`;
      dataPath = "pages.list";
      break;

    case "page":
      const pageId = options.positional?.[1];
      if (!pageId) {
        console.error("错误: 请指定页面 ID");
        process.exit(1);
      }
      query = `{
        pages {
          single (id: ${pageId}) {
            id
            path
            title
            content
            description
            contentType
            locale
            createdAt
            updatedAt
          }
        }
      }`;
      dataPath = "pages.single";
      break;

    case "users":
      if (options.search) {
        query = `{
          users {
            search (query: "${options.search}") {
              id
              name
              email
              providerKey
              isActive
              isVerified
              createdAt
            }
          }
        }`;
        dataPath = "users.search";
      } else {
        query = `{
          users {
            list {
              id
              name
              email
              providerKey
              isActive
              isVerified
              createdAt
            }
          }
        }`;
        dataPath = "users.list";
      }
      break;

    case "groups":
      query = `{
        groups {
          list {
            id
            name
            redirectOnLogin
            isSystem
          }
        }
      }`;
      dataPath = "groups.list";
      break;

    case "assets":
      if (options.folderId) {
        query = `{
          assets {
            list (folderId: ${options.folderId}) {
              id
              filename
              folderId
              mimeType
              size
              createdAt
              updatedAt
            }
          }
        }`;
        dataPath = "assets.list";
      } else {
        query = `{
          assets {
            list {
              id
              filename
              folderId
              mimeType
              size
              createdAt
              updatedAt
            }
          }
        }`;
        dataPath = "assets.list";
      }
      break;

    default:
      console.error(`错误: 不支持的资源类型: ${resource}`);
      console.error("支持的资源: pages, page, users, groups, assets");
      process.exit(1);
  }

  try {
    const result = await graphqlQuery(url, token, query);
    const data = dataPath.split(".").reduce((obj, key) => obj?.[key], result);

    if (options.limit && Array.isArray(data)) {
      console.log(`显示前 ${options.limit} 条记录 (共 ${data.length} 条)`);
      formatOutput(data.slice(0, parseInt(options.limit)), options.format);
    } else {
      const count = Array.isArray(data) ? data.length : 1;
      console.log(`查询结果: ${count} 条记录`);
      formatOutput(data, options.format);
    }
  } catch (error) {
    handleError(error, `查询 ${resource} 失败`);
  }
}

// 创建页面命令
async function cmdCreate(url, token, path, title, content, options) {
  const query = `mutation {
    pages {
      create (
        path: "${path}"
        title: "${title.replace(/"/g, '\\"')}"
        content: """${content.replace(/"/g, '\\"')}"""
        contentType: ${options.contentType || "markdown"}
        editor: ${options.editor || "markdown"}
        ${options.description ? `description: "${options.description.replace(/"/g, '\\"')}"` : ""}
        isPublished: true
        locale: ${options.locale || "zh"}
        ${options.parentId ? `parentId: ${options.parentId}` : ""}
      ) {
        responseResult {
          succeeded
          slug
          message
          errorCode
        }
        page {
          id
          path
          title
        }
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const response = result.pages.create;

    if (response.responseResult.succeeded) {
      console.log("✅ 页面创建成功！");
      console.log(`   ID: ${response.page.id}`);
      console.log(`   路径: ${response.page.path}`);
      console.log(`   标题: ${response.page.title}`);
    } else {
      console.error(`❌ 创建失败: ${response.responseResult.message}`);
      console.error(`   错误代码: ${response.responseResult.errorCode}`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error, "创建页面失败");
  }
}

// 更新页面命令
async function cmdUpdate(url, token, pageId, content, options) {
  const updateFields = [`id: ${pageId}`, `content: """${content.replace(/"/g, '\\"')}"""`];
  if (options.title) updateFields.push(`title: "${options.title.replace(/"/g, '\\"')}"`);
  if (options.path) updateFields.push(`path: "${options.path}"`);

  const query = `mutation {
    pages {
      update (${updateFields.join("\n")}) {
        responseResult {
          succeeded
          slug
          message
          errorCode
        }
        page {
          id
          path
          title
          updatedAt
        }
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const response = result.pages.update;

    if (response.responseResult.succeeded) {
      console.log("✅ 页面更新成功！");
      console.log(`   ID: ${response.page.id}`);
      console.log(`   路径: ${response.page.path}`);
      console.log(`   标题: ${response.page.title}`);
      console.log(`   更新时间: ${response.page.updatedAt}`);
    } else {
      console.error(`❌ 更新失败: ${response.responseResult.message}`);
      console.error(`   错误代码: ${response.responseResult.errorCode}`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error, "更新页面失败");
  }
}

// 删除页面命令
async function cmdDelete(url, token, pageId) {
  const query = `mutation {
    pages {
      delete (id: ${pageId}) {
        responseResult {
          succeeded
          slug
          message
          errorCode
        }
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const response = result.pages.delete;

    if (response.responseResult.succeeded) {
      console.log("✅ 页面删除成功！");
    } else {
      console.error(`❌ 删除失败: ${response.responseResult.message}`);
      console.error(`   错误代码: ${response.responseResult.errorCode}`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error, "删除页面失败");
  }
}

// 搜索页面命令
async function cmdSearch(url, token, queryStr, options) {
  const query = `{
    pageSearch {
      query (query: "${queryStr.replace(/"/g, '\\"')}"${options.path ? `, path: "${options.path}"` : ""}) {
        results {
          id
          title
          path
          description
          locale
        }
        totalHits
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const searchResult = result.pageSearch.query;

    console.log(`搜索 "${queryStr}" 找到 ${searchResult.totalHits} 条结果:`);

    if (options.limit) {
      console.log(`显示前 ${options.limit} 条`);
      formatOutput(searchResult.results.slice(0, parseInt(options.limit)), options.format);
    } else {
      formatOutput(searchResult.results, options.format);
    }
  } catch (error) {
    handleError(error, "搜索页面失败");
  }
}

// 主函数
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
      cmdQuery(url, token, positional[3], options);
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

    case "delete":
      if (!positional[3]) {
        console.error("错误: 删除页面需要提供页面 ID");
        console.error("用法: node skill.js delete <url> <token> <page-id>");
        process.exit(1);
      }
      cmdDelete(url, token, positional[3]);
      break;

    case "search":
      if (!positional[3]) {
        console.error("错误: 搜索需要提供查询关键词");
        console.error("用法: node skill.js search <url> <token> <query>");
        process.exit(1);
      }
      cmdSearch(url, token, positional[3], options);
      break;

    default:
      console.error(`错误: 未知命令: ${command}`);
      console.error("使用 --help 查看可用命令");
      process.exit(1);
  }
}

main();