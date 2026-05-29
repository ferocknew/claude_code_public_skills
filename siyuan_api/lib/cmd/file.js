/**
 * 文件查询命令
 */

const { siyuanPost } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");

/**
 * 获取文件内容
 */
async function cmdFileGet(url, token, filePath, options) {
  if (!filePath) {
    console.error("错误: 请指定文件路径");
    console.error("用法: node skill.js file get <path>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/file/getFile", { path: filePath });

    // getFile 返回文件内容（文本或 base64）
    if (typeof data === "string") {
      console.log(data);
    } else {
      formatOutput(data, options.format || "json");
    }
  } catch (error) {
    handleError(error, `获取文件 ${filePath} 失败`);
  }
}

/**
 * 列出目录内容
 */
async function cmdFileLs(url, token, dirPath, options) {
  if (!dirPath) {
    console.error("错误: 请指定目录路径");
    console.error("用法: node skill.js file ls <path>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/file/readDir", { path: dirPath });

    if (options.format === "json") {
      formatOutput(data, "json");
    } else if (options.format === "yaml") {
      formatOutput(data, "yaml");
    } else {
      const items = Array.isArray(data) ? data : [];
      console.log(`\n目录 ${dirPath} (共 ${items.length} 项):\n`);

      items.forEach(item => {
        const isDir = item.isDir || item.isSymlink;
        const icon = isDir ? "📁" : "📄";
        const size = item.size ? ` (${formatSize(item.size)})` : "";
        console.log(`  ${icon} ${item.name}${size}`);
      });
    }
  } catch (error) {
    handleError(error, `列出目录 ${dirPath} 失败`);
  }
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 文件命令路由
 */
async function cmdFile(url, token, subCmd, args, options) {
  switch (subCmd) {
    case "get":
      await cmdFileGet(url, token, args[0], options);
      break;

    case "ls":
      await cmdFileLs(url, token, args[0], options);
      break;

    default:
      console.error(`错误: 未知文件子命令: ${subCmd}`);
      console.error("可用子命令: get, ls");
      process.exit(1);
  }
}

module.exports = { cmdFile };
