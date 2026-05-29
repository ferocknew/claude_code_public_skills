/**
 * 属性查询命令
 */

const { siyuanPost } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");

/**
 * 获取块属性
 */
async function cmdAttrGet(url, token, blockId, options) {
  if (!blockId) {
    console.error("错误: 请指定块 ID");
    console.error("用法: node skill.js attr get <block-id>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/attr/getBlockAttrs", { id: blockId });

    if (options.format === "json") {
      formatOutput(data, "json");
    } else {
      // 默认以可读格式输出属性列表
      console.log(`\n块 ${blockId} 的属性:\n`);
      if (typeof data === "object" && data !== null) {
        Object.entries(data).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      } else {
        formatOutput(data, "yaml");
      }
    }
  } catch (error) {
    handleError(error, `获取块 ${blockId} 的属性失败`);
  }
}

/**
 * 属性命令路由
 */
async function cmdAttr(url, token, subCmd, args, options) {
  switch (subCmd) {
    case "get":
      await cmdAttrGet(url, token, args[0], options);
      break;

    default:
      console.error(`错误: 未知属性子命令: ${subCmd}`);
      console.error("可用子命令: get");
      process.exit(1);
  }
}

module.exports = { cmdAttr };
