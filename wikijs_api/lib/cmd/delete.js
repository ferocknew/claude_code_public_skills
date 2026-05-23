/**
 * 删除页面命令
 */

const { graphqlQuery } = require("../api");
const { showSuccess } = require("../output");
const { handleError } = require("../errors");

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

module.exports = { cmdDelete };