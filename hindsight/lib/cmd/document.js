/**
 * 文档命令：list-documents / get-document
 */

const { toInt } = require("../parser");
const { usageError } = require("../errors");

/**
 * list-documents —— 分页列出文档
 * @param {string[]} positionals
 * @param {Object} options
 * @param {Object} ctx
 */
async function cmdListDocuments(positionals, options, ctx) {
  const args = {
    limit: options.limit === undefined ? 100 : toInt(options.limit, "--limit", { min: 0 }),
    offset: options.offset === undefined ? 0 : toInt(options.offset, "--offset", { min: 0 }),
  };

  if (options.query !== undefined) args.q = String(options.query);

  return ctx.client.callTool("list_documents", args);
}

/**
 * get-document —— 查看单篇文档详情
 * @param {string[]} positionals
 * @param {Object} options
 * @param {Object} ctx
 */
async function cmdGetDocument(positionals, options, ctx) {
  const documentId = (positionals || []).join(" ").trim();
  if (!documentId) {
    throw usageError("get-document 需要参数 document_id", "用法：node skill.js get-document <document_id>");
  }

  return ctx.client.callTool("get_document", { document_id: documentId });
}

module.exports = {
  cmdListDocuments,
  cmdGetDocument,
};
