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
 * 从内容中提取关键词上下文摘要
 * @param {string} content - 页面内容（Markdown）
 * @param {string} keyword - 搜索关键词
 * @param {number|string} contextLength - 上下文长度（字符数）或 "行" 数（如 "1" 表示上下各1行）
 * @returns {string} 摘要文本
 */
function extractSnippet(content, keyword, contextLength = 100) {
  if (!content) return "";

  // 移除 Markdown 语法，保留纯文本
  const plainText = content
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // 移除图片
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 链接转为文字
    .replace(/```[\s\S]*?```/g, "") // 移除代码块
    .replace(/`([^`]+)`/g, "$1") // 移除行内代码
    .replace(/#{1,6}\s+/g, "") // 移除标题
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 移除加粗
    .replace(/\*([^*]+)\*/g, "$1") // 移除斜体
    .replace(/\s+/g, " ") // 压缩空白
    .trim();

  if (!plainText) return "";

  // 查找关键词位置
  const keywordLower = keyword.toLowerCase();
  const textLower = plainText.toLowerCase();
  const index = textLower.indexOf(keywordLower);

  if (index === -1) {
    // 没找到关键词，返回前N个字符
    return plainText.slice(0, contextLength) + "...";
  }

  // 按行提取（当 contextLength 比较小且看起来像行数时）
  const isLineMode = typeof contextLength === "number" && contextLength < 10;

  if (isLineMode) {
    const lines = plainText.split(/[。！？.!?\n]/).filter(l => l.trim());
    const keywordLineIndex = lines.findIndex(l => l.toLowerCase().includes(keywordLower));

    if (keywordLineIndex !== -1) {
      const startLine = Math.max(0, keywordLineIndex - contextLength);
      const endLine = Math.min(lines.length, keywordLineIndex + contextLength + 1);
      const snippetLines = lines.slice(startLine, endLine);

      let snippet = snippetLines.join("。");
      if (startLine > 0) snippet = "..." + snippet;
      if (endLine < lines.length) snippet = snippet + "...";
      return snippet;
    }
  }

  // 字符模式：提取上下文
  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(plainText.length, index + keyword.length + contextLength / 2);

  let snippet = plainText.slice(start, end);

  // 添加省略号
  if (start > 0) snippet = "..." + snippet;
  if (end < plainText.length) snippet = snippet + "...";

  return snippet;
}

/**
 * 页面历史命令
 */
async function cmdHistory(url, token, pageId, options) {
  const offsetPage = parseInt(options.page) || 0;
  const offsetSize = parseInt(options.limit) || 10;

  const query = `{
    pages {
      history (
        id: ${pageId}
        offsetPage: ${offsetPage}
        offsetSize: ${offsetSize}
      ) {
        total
        trail {
          versionId
          versionDate
          authorId
          authorName
          actionType
          valueBefore
          valueAfter
        }
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const history = result.pages.history;

    console.log(`\n页面历史 (共 ${history.total} 条记录):\n`);

    history.trail.forEach((item, idx) => {
      const actionMap = {
        "INIT": "创建",
        "UPDATE": "更新",
        "DELETE": "删除",
        "MOVE": "移动",
        "RENAME": "重命名"
      };
      const action = actionMap[item.actionType] || item.actionType;
      const versionNum = history.total - (offsetPage * offsetSize + idx);

      console.log(`${versionNum}. ${action} - ${item.authorName || '未知'}`);
      console.log(`   时间: ${item.versionDate}`);
      if (item.valueBefore && item.valueAfter) {
        console.log(`   变更: ${item.valueBefore} → ${item.valueAfter}`);
      } else if (item.valueAfter) {
        console.log(`   内容: ${item.valueAfter.substring(0, 50)}${item.valueAfter.length > 50 ? '...' : ''}`);
      }
      console.log(`   版本ID: ${item.versionId}`);
      console.log();
    });

    if ((offsetPage + 1) * offsetSize < history.total) {
      console.log(`更多记录: node skill.js history <url> <token> ${pageId} --page ${offsetPage + 1}`);
    }
  } catch (error) {
    handleError(error, "获取页面历史失败");
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

    let results = searchResult.results;
    if (options.limit) {
      results = results.slice(0, parseInt(options.limit));
    }

    // 默认启用预览摘要（行模式）
    const enablePreview = options.preview || options.snippet || (!options.format || options.format === "default");
    const contextLength = parseInt(options.contextLength) || 1; // 默认行模式
    const previewCount = parseInt(options.previewCount) || 3;

    if (enablePreview) {

      for (let i = 0; i < Math.min(results.length, previewCount); i++) {
        const page = results[i];
        const pageQuery = `{
          pages {
            single (id: ${page.id}) {
              content
            }
          }
        }`;
        const pageResult = await graphqlQuery(url, token, pageQuery);
        const content = pageResult.pages.single?.content || "";

        page.snippet = extractSnippet(content, queryStr, contextLength);
      }
    }

    // 格式化输出
    if (options.format === "json") {
      formatOutput(results, "json");
    } else {
      results.forEach((r, idx) => {
        console.log(`${idx + 1}. [${r.title}](${r.path})`);
        if (r.snippet) {
          console.log(`   ${r.snippet}`);
        }
        console.log();
      });
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
  cmdSearch,
  cmdHistory
};