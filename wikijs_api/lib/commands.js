/**
 * Wiki.js 命令处理
 */

const { graphqlQuery } = require("./api");
const { formatOutput, showSuccess } = require("./output");
const { handleError } = require("./errors");

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
      console.error("支持的资源: pages, page, users, groups");
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

/**
 * 创建页面命令
 */
async function cmdCreate(url, token, path, title, content, options) {
  const query = `mutation {
    pages {
      create (
        path: "${path}"
        title: "${title.replace(/"/g, '\\"')}"
        description: "${options.description || ""}"
        content: """${content.replace(/"/g, '\\"')}"""
        editor: "${options.editor || "markdown"}"
        isPrivate: false
        isPublished: true
        locale: "${options.locale || "zh"}"
        tags: []
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
      showSuccess("页面创建成功！", {
        "ID": response.page.id,
        "路径": response.page.path,
        "标题": response.page.title
      });
    } else {
      handleError(error, `创建失败: ${response.responseResult.message}`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error, "创建页面失败");
  }
}

/**
 * 更新页面命令
 */
async function cmdUpdate(url, token, pageId, content, options) {
  const updateFields = [`id: ${pageId}`, `content: """${content.replace(/"/g, '\\"')}"""`];
  if (options.title) updateFields.push(`title: "${options.title.replace(/"/g, '\\"')}"`);
  if (options.path) updateFields.push(`path: "${options.path}"`);

  const query = `mutation {
    pages {
      update (
        ${updateFields.join("\n")}
        description: "${options.description || ""}"
        editor: "${options.editor || "markdown"}"
        isPrivate: false
        isPublished: true
        locale: "${options.locale || "zh"}"
        tags: []
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
          updatedAt
        }
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const response = result.pages.update;

    if (response.responseResult.succeeded) {
      showSuccess("页面更新成功！", {
        "ID": response.page.id,
        "路径": response.page.path,
        "标题": response.page.title,
        "更新时间": response.page.updatedAt
      });
    } else {
      handleError(error, `更新失败: ${response.responseResult.message}`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error, "更新页面失败");
  }
}

/**
 * 删除页面命令
 */
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
      showSuccess("页面删除成功！");
    } else {
      handleError(error, `删除失败: ${response.responseResult.message}`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error, "删除页面失败");
  }
}

/**
 * 搜索页面命令
 */
async function cmdSearch(url, token, queryStr, options) {
  const query = `{
    pages {
      search(query: "${queryStr.replace(/"/g, '\\"')}"${options.path ? `, path: "${options.path}"` : ""}${options.locale ? `, locale: "${options.locale}"` : ""}) {
        results {
          id
          title
          path
          description
          locale
        }
        totalHits
        suggestions
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const searchResult = result.pages.search;

    console.log(`\n搜索 "${queryStr}" 找到 ${searchResult.totalHits} 条结果:\n`);

    if (options.limit) {
      console.log(`显示前 ${options.limit} 条\n`);
      formatOutput(searchResult.results.slice(0, parseInt(options.limit)), options.format);
    } else {
      formatOutput(searchResult.results, options.format);
    }

    if (searchResult.suggestions && searchResult.suggestions.length > 0) {
      console.log(`\n建议搜索词: ${searchResult.suggestions.join(", ")}`);
    }
  } catch (error) {
    handleError(error, "搜索页面失败");
  }
}

module.exports = {
  cmdQuery,
  cmdCreate,
  cmdUpdate,
  cmdDelete,
  cmdSearch
};