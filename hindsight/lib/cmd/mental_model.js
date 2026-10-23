/**
 * 心智模型命令：list-mental-models
 *
 * 服务端当前只暴露列表接口；单条查询工具 get_mental_model 未暴露。
 */

const { toInt, splitCsv } = require("../parser");

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

module.exports = { cmdListMentalModels };
