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

    default:
      console.error(`错误: 未知块子命令: ${subCmd}`);
      console.error("可用子命令: kramdown, children");
      process.exit(1);
  }
}

module.exports = { cmdBlock };
