/**
 * 查询命令
 */

const { graphqlQuery } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");
const yaml = require("js-yaml");

/**
 * 查询命令
 */
async function cmdQuery(url, token, resource, options, pageId = null) {
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

    case "tree": {
      const pathVal = options.path || "";
      const locale = options.locale || "en";
      const mode = options.mode || "ALL";

      if (!pathVal) {
        console.error("错误: 查询目录树需要提供 --path 参数");
        console.error("用法: node skill.js query tree --path <directory-path>");
        process.exit(1);
      }

      const validModes = ["FOLDERS", "PAGES", "ALL"];
      const modeUpper = mode.toUpperCase();
      if (!validModes.includes(modeUpper)) {
        console.error(`错误: 无效的 mode 参数: ${mode}`);
        console.error(`可选值: ${validModes.join(", ")}`);
        process.exit(1);
      }

      // PAGES 模式先尝试服务端原生查询，失败后降级为 ALL + 客户端过滤
      query = `{
        pages {
          tree (path: "${pathVal}", locale: "${locale}", mode: ${modeUpper}) {
            id
            path
            depth
            title
            isPrivate
            isFolder
            parent
            pageId
            locale
          }
        }
      }`;
      dataPath = "pages.tree";
      // 保存降级所需的参数
      options._treeFallback = modeUpper === "PAGES" ? { pathVal, locale } : null;
      break;
    }

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
            isSystem
          }
        }
      }`;
      dataPath = "groups.list";
      break;

    default:
      console.error(`错误: 不支持的资源类型: ${resource}`);
      console.error("支持的资源: pages, page, tree, users, groups");
      process.exit(1);
  }

  try {
    const result = await graphqlQuery(url, token, query);
    const data = dataPath.split(".").reduce((obj, key) => obj?.[key], result);
    outputTree(data, resource, options);
  } catch (error) {
    // PAGES 模式降级：用 ALL 查询后客户端过滤 isFolder === false
    if (options._treeFallback) {
      const { pathVal, locale } = options._treeFallback;
      const fallbackQuery = `{
        pages {
          tree (path: "${pathVal}", locale: "${locale}", mode: ALL) {
            id
            path
            depth
            title
            isPrivate
            isFolder
            parent
            pageId
            locale
          }
        }
      }`;
      try {
        const result = await graphqlQuery(url, token, fallbackQuery);
        const data = result.pages.tree.filter(item => !item.isFolder);
        outputTree(data, resource, options);
        return;
      } catch (fallbackError) {
        handleError(fallbackError, `查询 tree 失败`);
        return;
      }
    }
    handleError(error, `查询 ${resource} 失败`);
  }
}

function outputTree(data, resource, options) {
  if (resource === "tree") {
    const format = options.format || "yaml";

    if (format === "yaml") {
      console.log(yaml.dump(data, { lineWidth: -1, noRefs: true }));
      return;
    }
    if (format === "json") {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // 默认可读格式
    const items = Array.isArray(data) ? data : [];
    console.log(`\n目录树 (共 ${items.length} 项):\n`);
    items.forEach(item => {
      const indent = "  ".repeat(item.depth || 0);
      const icon = item.isFolder ? "📁" : "📄";
      const privateMark = item.isPrivate ? " [私有]" : "";
      console.log(`${indent}${icon} ${item.title}${privateMark}`);
      console.log(`${indent}   路径: ${item.path} | ID: ${item.pageId || item.id}`);
    });
    return;
  }

  if (options.limit && Array.isArray(data)) {
    console.log(`显示前 ${options.limit} 条记录 (共 ${data.length} 条)`);
    formatOutput(data.slice(0, parseInt(options.limit)), options.format);
  } else {
    const count = Array.isArray(data) ? data.length : 1;
    console.log(`查询结果: ${count} 条记录`);
    formatOutput(data, options.format);
  }
}

module.exports = { cmdQuery };