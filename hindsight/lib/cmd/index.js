/**
 * 命令模块统一导出
 */

const memory = require("./memory");
const mentalModel = require("./mental_model");
const document = require("./document");
const tag = require("./tag");
const knowledgeBase = require("./knowledge_base");
const meta = require("./meta");

module.exports = {
  ...memory,
  ...mentalModel,
  ...document,
  ...tag,
  ...knowledgeBase,
  ...meta,
};
