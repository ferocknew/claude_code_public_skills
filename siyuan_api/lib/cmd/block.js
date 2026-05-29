/**
 * 块查询命令
 */

const { siyuanPost } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");

/**
 * 获取块的 Kramdown 内容
 */
async function cmdBlockKramdown(url, token, blockId, options) {
  if (!blockId) {
    console.error("错误: 请指定块 ID");
    console.error("用法: node skill.js block kramdown <block-id>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/block/getBlockKramdown", { id: blockId });

    if (options.format === "json") {
      formatOutput(data, "json");
    } else {
      // 默认直接输出 kramdown 内容
      if (typeof data === "object" && data.kramdown) {
        console.log(data.kramdown);
      } else {
        formatOutput(data, "yaml");
      }
    }
  } catch (error) {
    handleError(error, `获取块 ${blockId} 的 Kramdown 失败`);
  }
}

/**
 * 获取子块列表
 */
async function cmdBlockChildren(url, token, parentId, options) {
  if (!parentId) {
    console.error("错误: 请指定父块 ID");
    console.error("用法: node skill.js block children <parent-id>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/block/getChildBlocks", { id: parentId });

    if (options.format === "json") {
      formatOutput(data, "json");
    } else if (options.format === "yaml") {
      formatOutput(data, "yaml");
    } else {
      const blocks = Array.isArray(data) ? data : [];
      console.log(`\n子块列表 (共 ${blocks.length} 个):\n`);

      blocks.forEach((block, idx) => {
        const type = block.type || "unknown";
        const content = block.content || block.markdown || "";
        const preview = content.substring(0, 80) + (content.length > 80 ? "..." : "");
        console.log(`${idx + 1}. [${type}] ${preview}`);
        console.log(`   ID: ${block.id}`);
      });
    }
  } catch (error) {
    handleError(error, `获取 ${parentId} 的子块失败`);
  }
}

/**
 * 插入块（Markdown 或 DOM）
 */
async function cmdBlockInsert(url, token, data, options) {
  if (!data) {
    console.error("错误: 请提供块内容");
    console.error("用法: node skill.js block insert <markdown> --parentID <id> [--nextID <id>]");
    process.exit(1);
  }

  const hasAnchor = options.parentid || options.nextid || options.previousid;
  if (!hasAnchor) {
    console.error("错误: 需要指定插入位置（--parentID, --nextID 或 --previousID 至少一个）");
    process.exit(1);
  }

  try {
    const params = { dataType: "markdown", data };
    if (options.nextid) params.nextID = options.nextid;
    if (options.previousid) params.previousID = options.previousid;
    if (options.parentid) params.parentID = options.parentid;

    const result = await siyuanPost(url, token, "/api/block/insertBlock", params);
    console.log(`✅ 块已插入`);
    if (result) formatOutput(result, options.format || "json");
  } catch (error) {
    handleError(error, "插入块失败");
  }
}

/**
 * 前置插入子块
 */
async function cmdBlockPrepend(url, token, data, options) {
  if (!data || !options.parentid) {
    console.error("错误: 需要提供内容和 --parentID");
    console.error("用法: node skill.js block prepend <markdown> --parentID <id>");
    process.exit(1);
  }

  try {
    const result = await siyuanPost(url, token, "/api/block/prependBlock", {
      dataType: "markdown", data, parentID: options.parentid
    });
    console.log(`✅ 子块已前置插入`);
    if (result) formatOutput(result, options.format || "json");
  } catch (error) {
    handleError(error, "前置插入子块失败");
  }
}

/**
 * 后置插入子块
 */
async function cmdBlockAppend(url, token, data, options) {
  if (!data || !options.parentid) {
    console.error("错误: 需要提供内容和 --parentID");
    console.error("用法: node skill.js block append <markdown> --parentID <id>");
    process.exit(1);
  }

  try {
    const result = await siyuanPost(url, token, "/api/block/appendBlock", {
      dataType: "markdown", data, parentID: options.parentid
    });
    console.log(`✅ 子块已后置插入`);
    if (result) formatOutput(result, options.format || "json");
  } catch (error) {
    handleError(error, "后置插入子块失败");
  }
}

/**
 * 更新块
 */
async function cmdBlockUpdate(url, token, blockId, data, options) {
  if (!blockId || !data) {
    console.error("错误: 需要提供块 ID 和新内容");
    console.error("用法: node skill.js block update <id> <markdown>");
    process.exit(1);
  }

  try {
    const result = await siyuanPost(url, token, "/api/block/updateBlock", {
      dataType: "markdown", data, id: blockId
    });
    console.log(`✅ 块已更新: ${blockId}`);
    if (result) formatOutput(result, options.format || "json");
  } catch (error) {
    handleError(error, `更新块 ${blockId} 失败`);
  }
}

/**
 * 删除块
 */
async function cmdBlockDelete(url, token, blockId, options) {
  if (!blockId) {
    console.error("错误: 请指定块 ID");
    console.error("用法: node skill.js block delete <id>");
    process.exit(1);
  }

  try {
    await siyuanPost(url, token, "/api/block/deleteBlock", { id: blockId });
    console.log(`✅ 块已删除: ${blockId}`);
  } catch (error) {
    handleError(error, `删除块 ${blockId} 失败`);
  }
}

/**
 * 移动块
 */
async function cmdBlockMove(url, token, blockId, options) {
  if (!blockId) {
    console.error("错误: 请指定块 ID");
    console.error("用法: node skill.js block move <id> --previousID <id> 或 --parentID <id>");
    process.exit(1);
  }

  if (!options.previousid && !options.parentid) {
    console.error("错误: 需要指定目标位置（--previousID 或 --parentID）");
    process.exit(1);
  }

  try {
    const params = { id: blockId };
    if (options.previousid) params.previousID = options.previousid;
    if (options.parentid) params.parentID = options.parentid;

    await siyuanPost(url, token, "/api/block/moveBlock", params);
    console.log(`✅ 块已移动: ${blockId}`);
  } catch (error) {
    handleError(error, `移动块 ${blockId} 失败`);
  }
}

/**
 * 块命令路由
 */
async function cmdBlock(url, token, subCmd, args, options) {
  switch (subCmd) {
    case "kramdown":
      await cmdBlockKramdown(url, token, args[0], options);
      break;

    case "children":
      await cmdBlockChildren(url, token, args[0], options);
      break;

    case "insert":
      await cmdBlockInsert(url, token, args[0], options);
      break;

    case "prepend":
      await cmdBlockPrepend(url, token, args[0], options);
      break;

    case "append":
      await cmdBlockAppend(url, token, args[0], options);
      break;

    case "update":
      await cmdBlockUpdate(url, token, args[0], args[1], options);
      break;

    case "delete":
    case "rm":
      await cmdBlockDelete(url, token, args[0], options);
      break;

    case "move":
      await cmdBlockMove(url, token, args[0], options);
      break;

    default:
      console.error(`错误: 未知块子命令: ${subCmd}`);
      console.error("可用子命令: kramdown, children, insert, prepend, append, update, delete, move");
      process.exit(1);
  }
}

module.exports = { cmdBlock };
