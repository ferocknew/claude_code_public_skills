/**
 * 标签命令：list-tags
 */

const { toInt } = require("../parser");

/**
 * list-tags —— 分页列出标签及其频次
 * @param {string[]} positionals
 * @param {Object} options
 * @param {Object} ctx
 */
async function cmdListTags(positionals, options, ctx) {
  const args = {
    limit: options.limit === undefined ? 100 : toInt(options.limit, "--limit", { min: 0 }),
    offset: options.offset === undefined ? 0 : toInt(options.offset, "--offset", { min: 0 }),
  };

  if (options.query !== undefined) args.q = String(options.query);

  return ctx.client.callTool("list_tags", args);
}

module.exports = {
  cmdListTags,
};
