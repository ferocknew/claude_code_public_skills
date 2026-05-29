/**
 * 导出命令
 */

const { siyuanPost } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");

/**
 * 导出文档为 Markdown
 */
async function cmdExportMd(url, token, docId, options) {
  if (!docId) {
    console.error("错误: 请指定文档 ID");
    console.error("用法: node skill.js export md <doc-id>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/export/exportMdContent", { id: docId });

    if (options.format === "json") {
      formatOutput(data, "json");
    } else if (options.format === "yaml") {
      formatOutput(data, "yaml");
    } else {
      // 默认直接输出 Markdown 内容
      if (data && typeof data === "object") {
        const content = data.content || data.markdown || "";
        const hPath = data.hPath || "";

        if (hPath) {
          console.log(`\n文档路径: ${hPath}\n`);
        }

        if (content) {
          console.log(content);
        } else {
          formatOutput(data, "yaml");
        }
      } else if (typeof data === "string") {
        console.log(data);
      } else {
        formatOutput(data, "yaml");
      }
    }
  } catch (error) {
    handleError(error, `导出文档 ${docId} 失败`);
  }
}

/**
 * 导出命令路由
 */
async function cmdExport(url, token, subCmd, args, options) {
  switch (subCmd) {
    case "md":
      await cmdExportMd(url, token, args[0], options);
      break;

    default:
      console.error(`错误: 未知导出子命令: ${subCmd}`);
      console.error("可用子命令: md");
      process.exit(1);
  }
}

module.exports = { cmdExport };
