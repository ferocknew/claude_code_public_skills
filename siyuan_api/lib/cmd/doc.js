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
 * 通过 Markdown 创建文档
 */
async function cmdDocCreate(url, token, markdown, options) {
  const notebook = options.notebook;
  const docPath = options.path;
  const title = options.title;

  if (!notebook) {
    console.error("错误: 需要提供 --notebook 参数");
    console.error("用法: node skill.js doc create --notebook <id> --path <path> [--title <title>] <markdown>");
    process.exit(1);
  }

  if (!docPath) {
    console.error("错误: 需要提供 --path 参数");
    console.error("用法: node skill.js doc create --notebook <id> --path <path> [--title <title>] <markdown>");
    process.exit(1);
  }

  // markdown 允许为空（创建空文档/文件夹）
  const md = markdown || "";

  try {
    // path 需要 / 开头
    const fullPath = docPath.startsWith("/") ? docPath : "/" + docPath;
    const params = { notebook, path: fullPath, markdown: md };

    const data = await siyuanPost(url, token, "/api/filetree/createDocWithMd", params);
    console.log(`✅ 文档已创建`);
    console.log(`   笔记本: ${notebook}`);
    console.log(`   路径: ${fullPath}`);
    if (data) {
      console.log(`   ID: ${typeof data === "string" ? data : data.id || JSON.stringify(data)}`);
    }
  } catch (error) {
    handleError(error, `创建文档失败`);
  }
}

/**
 * 删除文档（通过 ID）
 */
async function cmdDocRemove(url, token, docId, options) {
  if (!docId) {
    console.error("错误: 请指定文档 ID");
    console.error("用法: node skill.js doc remove <id>");
    process.exit(1);
  }

  try {
    await siyuanPost(url, token, "/api/filetree/removeDocByID", { id: docId });
    console.log(`✅ 文档已删除: ${docId}`);
  } catch (error) {
    handleError(error, `删除文档 ${docId} 失败`);
  }
}

/**
 * 重命名文档（通过 ID）
 */
async function cmdDocRename(url, token, docId, options) {
  if (!docId) {
    console.error("错误: 请指定文档 ID");
    console.error("用法: node skill.js doc rename <id> --title <new-title>");
    process.exit(1);
  }

  const title = options.title;
  if (!title) {
    console.error("错误: 需要提供 --title 参数");
    console.error("用法: node skill.js doc rename <id> --title <new-title>");
    process.exit(1);
  }

  try {
    await siyuanPost(url, token, "/api/filetree/renameDocByID", { id: docId, title });
    console.log(`✅ 文档已重命名: ${docId} → ${title}`);
  } catch (error) {
    handleError(error, `重命名文档 ${docId} 失败`);
  }
}

/**
 * 文档命令路由
 */
async function cmdDoc(url, token, subCmd, args, options) {
  switch (subCmd) {
    case "create":
      await cmdDocCreate(url, token, args[0], options);
      break;

    case "remove":
    case "rm":
    case "delete":
      await cmdDocRemove(url, token, args[0], options);
      break;

    case "rename":
      await cmdDocRename(url, token, args[0], options);
      break;

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
      console.error("可用子命令: create, remove, rename, hpath, hpath-by-id, path-by-id, ids-by-hpath");
      process.exit(1);
  }
}

module.exports = { cmdDoc };
