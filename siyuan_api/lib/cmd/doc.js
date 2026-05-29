/**
 * 文档查询命令
 */

const { siyuanPost } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");

/**
 * 获取文档的人类可读路径（通过存储路径）
 */
async function cmdDocHPath(url, token, options) {
  const notebook = options.notebook;
  const docPath = options.path;

  if (!notebook || !docPath) {
    console.error("错误: 需要提供 --notebook 和 --path 参数");
    console.error("用法: node skill.js doc hpath --notebook <id> --path <path>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/filetree/getHPathByPath", {
      notebook,
      path: docPath
    });
    formatOutput(data, options.format || "default");
  } catch (error) {
    handleError(error, "获取文档 HPath 失败");
  }
}

/**
 * 获取文档的人类可读路径（通过块 ID）
 */
async function cmdDocHPathById(url, token, blockId, options) {
  if (!blockId) {
    console.error("错误: 请指定块 ID");
    console.error("用法: node skill.js doc hpath-by-id <block-id>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/filetree/getHPathByID", { id: blockId });
    formatOutput(data, options.format || "default");
  } catch (error) {
    handleError(error, `获取块 ${blockId} 的 HPath 失败`);
  }
}

/**
 * 获取文档的存储路径（通过块 ID）
 */
async function cmdDocPathById(url, token, blockId, options) {
  if (!blockId) {
    console.error("错误: 请指定块 ID");
    console.error("用法: node skill.js doc path-by-id <block-id>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/filetree/getPathByID", { id: blockId });
    formatOutput(data, options.format || "default");
  } catch (error) {
    handleError(error, `获取块 ${blockId} 的路径失败`);
  }
}

/**
 * 通过人类可读路径获取文档 ID
 */
async function cmdDocIdsByHPath(url, token, options) {
  const notebook = options.notebook;
  const hPath = options.path;

  if (!notebook || !hPath) {
    console.error("错误: 需要提供 --notebook 和 --path 参数");
    console.error("用法: node skill.js doc ids-by-hpath --notebook <id> --path <hpath>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/filetree/getIDsByHPath", {
      notebook,
      path: hPath
    });
    formatOutput(data, options.format || "json");
  } catch (error) {
    handleError(error, "获取文档 ID 失败");
  }
}

/**
 * 文档命令路由
 */
async function cmdDoc(url, token, subCmd, args, options) {
  switch (subCmd) {
    case "hpath":
      await cmdDocHPath(url, token, options);
      break;

    case "hpath-by-id":
      await cmdDocHPathById(url, token, args[0], options);
      break;

    case "path-by-id":
      await cmdDocPathById(url, token, args[0], options);
      break;

    case "ids-by-hpath":
      await cmdDocIdsByHPath(url, token, options);
      break;

    default:
      console.error(`错误: 未知文档子命令: ${subCmd}`);
      console.error("可用子命令: hpath, hpath-by-id, path-by-id, ids-by-hpath");
      process.exit(1);
  }
}

module.exports = { cmdDoc };
