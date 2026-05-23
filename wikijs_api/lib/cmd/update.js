/**
 * 更新页面命令
 */

const { graphqlQuery } = require("../api");
const { showSuccess } = require("../output");
const { handleError } = require("../errors");

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
      handleError(null, `更新失败: ${response.responseResult.message}`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error, "更新页面失败");
  }
}

module.exports = { cmdUpdate };