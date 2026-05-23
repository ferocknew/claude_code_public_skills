/**
 * 版本命令
 */

const { graphqlQuery } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");

/**
 * 获取特定版本命令
 */
async function cmdVersion(url, token, pageId, versionId, options) {
  const fields = ["action", "authorId", "authorName", "content", "contentType", "versionDate", "description", "title", "path", "tags"];

  // 如果不需要完整内容，可以排除 content 字段以节省 Token
  if (!options.fullContent && !options.content) {
    const contentIdx = fields.indexOf("content");
    if (contentIdx !== -1) fields.splice(contentIdx, 1);
  }

  const query = `{
    pages {
      version (
        pageId: ${pageId}
        versionId: ${versionId}
      ) {
        ${fields.join("\n")}
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const version = result.pages.version;

    if (options.format === "yaml") {
      formatOutput(version, "yaml");
    } else if (options.format === "json") {
      formatOutput(version, "json");
    } else {
      console.log(`\n版本 ${versionId} - ${version.title}\n`);
      console.log(`路径: ${version.path}`);
      console.log(`操作: ${version.action}`);
      console.log(`作者: ${version.authorName} (${version.authorId})`);
      console.log(`时间: ${version.versionDate}`);
      if (version.content) {
        const preview = options.fullContent ? version.content :
          version.content.substring(0, 200) + (version.content.length > 200 ? "\n...（省略）" : "");
        console.log(`\n${preview}`);
      }
    }
  } catch (error) {
    handleError(error, "获取版本内容失败");
  }
}

module.exports = { cmdVersion };