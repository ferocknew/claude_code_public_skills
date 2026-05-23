/**
 * 创建页面命令
 */

const { graphqlQuery } = require("../api");
const { showSuccess } = require("../output");
const { handleError } = require("../errors");

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
        isPrivate: ${options.isPrivate !== undefined ? options.isPrivate : false}
        isPublished: ${options.isPublished !== undefined ? options.isPublished : true}
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

module.exports = { cmdCreate };