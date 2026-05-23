/**
 * 评论命令
 * > ⚠️ 评论删除功能需人工处理，不支持通过 API 删除
 */

const { graphqlQuery } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");

/**
 * 查询评论列表
 */
async function cmdCommentsList(url, token, path, locale, options) {
  const fields = options.fields ? options.fields.split(",") : [
    "id", "content", "authorName", "authorId", "createdAt", "updatedAt"
  ];

  const query = `{
    comments {
      list (
        path: "${path}"
        locale: "${locale}"
      ) {
        ${fields.join("\n")}
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const comments = result.comments.list;

    const output = {
      path: path,
      locale: locale,
      count: comments.length,
      comments: comments
    };

    if (options.format === "yaml") {
      formatOutput(output, "yaml");
    } else if (options.format === "json") {
      formatOutput(output, "json");
    } else {
      console.log(`\n页面: ${path} (${locale})`);
      console.log(`评论数: ${comments.length}\n`);
      comments.forEach(c => {
        console.log(`[${c.id}] ${c.authorName} @ ${c.createdAt}`);
        console.log(`  ${c.content}\n`);
      });
    }
  } catch (error) {
    handleError(error, "查询评论失败");
  }
}

/**
 * 查询单条评论
 */
async function cmdCommentsSingle(url, token, commentId, options) {
  const fields = options.fields ? options.fields.split(",") : [
    "id", "content", "render", "authorName", "authorId", "authorEmail",
    "authorIP", "createdAt", "updatedAt"
  ];

  const query = `{
    comments {
      single (
        id: ${commentId}
      ) {
        ${fields.join("\n")}
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const comment = result.comments.single;

    if (options.format === "yaml") {
      formatOutput(comment, "yaml");
    } else if (options.format === "json") {
      formatOutput(comment, "json");
    } else {
      console.log(`\n评论 ID: ${comment.id}`);
      console.log(`作者: ${comment.authorName} (${comment.authorId})`);
      console.log(`时间: ${comment.createdAt}`);
      if (comment.updatedAt !== comment.createdAt) {
        console.log(`更新: ${comment.updatedAt}`);
      }
      console.log(`\n内容:\n${comment.content}`);
    }
  } catch (error) {
    handleError(error, "查询评论失败");
  }
}

/**
 * 创建评论
 */
async function cmdCommentsCreate(url, token, pageId, content, options) {
  const guestName = options.guestName || "";
  const guestEmail = options.guestEmail || "";
  const replyTo = options.replyTo || 0;

  let mutationArgs = `pageId: ${pageId}, content: """${content.replace(/"/g, '\\"')}"""`;
  if (guestName) mutationArgs += `, guestName: "${guestName}"`;
  if (guestEmail) mutationArgs += `, guestEmail: "${guestEmail}"`;
  if (replyTo) mutationArgs += `, replyTo: ${replyTo}`;

  const query = `mutation {
    comments {
      create (
        ${mutationArgs}
      ) {
        responseResult {
          succeeded
          message
          errorCode
        }
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const response = result.comments.create;

    if (response.responseResult.succeeded) {
      if (options.format === "yaml") {
        formatOutput({ succeeded: true, message: response.responseResult.message }, "yaml");
      } else if (options.format === "json") {
        formatOutput({ succeeded: true, message: response.responseResult.message }, "json");
      } else {
        console.log(`✓ ${response.responseResult.message}`);
      }
    } else {
      handleError(null, `创建失败: ${response.responseResult.message}`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error, "创建评论失败");
  }
}

/**
 * 更新评论
 */
async function cmdCommentsUpdate(url, token, commentId, content, options) {
  const query = `mutation {
    comments {
      update (
        id: ${commentId}
        content: """${content.replace(/"/g, '\\"')}"""
      ) {
        responseResult {
          succeeded
          message
          errorCode
        }
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const response = result.comments.update;

    if (response.responseResult.succeeded) {
      if (options.format === "yaml") {
        formatOutput({ succeeded: true, message: response.responseResult.message }, "yaml");
      } else if (options.format === "json") {
        formatOutput({ succeeded: true, message: response.responseResult.message }, "json");
      } else {
        console.log(`✓ ${response.responseResult.message}`);
      }
    } else {
      handleError(null, `更新失败: ${response.responseResult.message}`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error, "更新评论失败");
  }
}

module.exports = {
  cmdCommentsList,
  cmdCommentsSingle,
  cmdCommentsCreate,
  cmdCommentsUpdate
};