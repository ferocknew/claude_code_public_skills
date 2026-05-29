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
 * 设置块属性
 */
async function cmdAttrSet(url, token, blockId, attrsJson, options) {
  if (!blockId) {
    console.error("错误: 请指定块 ID");
    console.error("用法: node skill.js attr set <id> '<json-attrs>'");
    process.exit(1);
  }

  let attrs;
  if (attrsJson) {
    try {
      attrs = JSON.parse(attrsJson);
    } catch (e) {
      console.error("错误: 属性必须是有效的 JSON 格式");
      console.error("示例: node skill.js attr set <id> '{\"custom-tag\":\"重要\"}'");
      process.exit(1);
    }
  } else if (options.attrs) {
    try {
      attrs = JSON.parse(options.attrs);
    } catch (e) {
      console.error("错误: --attrs 参数必须是有效的 JSON 格式");
      process.exit(1);
    }
  } else {
    console.error("错误: 请提供属性 JSON");
    console.error("用法: node skill.js attr set <id> '{\"custom-tag\":\"重要\"}'");
    process.exit(1);
  }

  try {
    await siyuanPost(url, token, "/api/attr/setBlockAttrs", { id: blockId, attrs });
    console.log(`✅ 块属性已更新: ${blockId}`);
    console.log(`   属性: ${JSON.stringify(attrs)}`);
  } catch (error) {
    handleError(error, `设置块 ${blockId} 的属性失败`);
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

    case "set":
      await cmdAttrSet(url, token, args[0], args[1], options);
      break;

    default:
      console.error(`错误: 未知属性子命令: ${subCmd}`);
      console.error("可用子命令: get, set");
      process.exit(1);
  }
}

module.exports = { cmdAttr };
