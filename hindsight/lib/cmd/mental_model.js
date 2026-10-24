/**
 * 心智模型命令：list-mental-models / get-mental-model
 */

const { toInt, splitCsv } = require("../parser");
const { usageError } = require("../errors");

/**
 * list-mental-models —— 分页列出心智模型
 * @param {string[]} positionals
 * @param {Object} options
 * @param {Object} ctx
 */
async function cmdListMentalModels(positionals, options, ctx) {
  const args = {
    limit: options.limit === undefined ? 100 : toInt(options.limit, "--limit", { min: 1, max: 1000 }),
    offset: options.offset === undefined ? 0 : toInt(options.offset, "--offset", { min: 0 }),
  };

  if (options.tags !== undefined) args.tags = splitCsv(options.tags, "--tags");

  return ctx.client.callTool("list_mental_models", args);
}

/**
 * get-mental-model —— 查看单条心智模型详情
 * @param {string[]} positionals
 * @param {Object} options
 * @param {Object} ctx
 */
async function cmdGetMentalModel(positionals, options, ctx) {
  const mentalModelId = (positionals || []).join(" ").trim();
  if (!mentalModelId) {
    throw usageError("get-mental-model 需要参数 mental_model_id", "用法：node skill.js get-mental-model <mental_model_id> [--detail]");
  }

  const args = { mental_model_id: mentalModelId };
  if (options.detail) args.detail = true;

  return ctx.client.callTool("get_mental_model", args);
}

module.exports = { cmdListMentalModels, cmdGetMentalModel };
