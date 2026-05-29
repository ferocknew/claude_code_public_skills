/**
 * 笔记本命令
 */

const { siyuanPost } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");
const yaml = require("js-yaml");

/**
 * 列出所有笔记本
 */
async function cmdNotebookLs(url, token, options) {
  try {
    const data = await siyuanPost(url, token, "/api/notebook/lsNotebooks");

    // 按关闭状态分组：先显示已打开的
    const notebooks = data.notebooks || data || [];
    const opened = notebooks.filter(n => !n.closed);
    const closed = notebooks.filter(n => n.closed);

    if (options.format === "json") {
      formatOutput(notebooks, "json");
    } else if (options.format === "yaml") {
      console.log(yaml.dump(notebooks, { lineWidth: -1, noRefs: true }));
    } else {
      console.log(`\n笔记本列表 (共 ${notebooks.length} 个，已打开 ${opened.length} 个):\n`);

      if (opened.length > 0) {
        console.log("📂 已打开:");
        opened.forEach(nb => {
          console.log(`   ${nb.name}`);
          console.log(`      ID: ${nb.id}`);
        });
      }

      if (closed.length > 0) {
        console.log("\n📁 已关闭:");
        closed.forEach(nb => {
          console.log(`   ${nb.name}`);
          console.log(`      ID: ${nb.id}`);
        });
      }
    }
  } catch (error) {
    handleError(error, "获取笔记本列表失败");
  }
}

/**
 * 打开笔记本
 */
async function cmdNotebookOpen(url, token, notebookId, options) {
  try {
    await siyuanPost(url, token, "/api/notebook/openNotebook", { notebook: notebookId });
    console.log(`✅ 笔记本 ${notebookId} 已打开`);
  } catch (error) {
    handleError(error, `打开笔记本 ${notebookId} 失败`);
  }
}

/**
 * 关闭笔记本
 */
async function cmdNotebookClose(url, token, notebookId, options) {
  try {
    await siyuanPost(url, token, "/api/notebook/closeNotebook", { notebook: notebookId });
    console.log(`✅ 笔记本 ${notebookId} 已关闭`);
  } catch (error) {
    handleError(error, `关闭笔记本 ${notebookId} 失败`);
  }
}

/**
 * 获取笔记本配置
 */
async function cmdNotebookConf(url, token, notebookId, options) {
  try {
    const data = await siyuanPost(url, token, "/api/notebook/getNotebookConf", { notebook: notebookId });
    formatOutput(data, options.format || "yaml");
  } catch (error) {
    handleError(error, `获取笔记本 ${notebookId} 配置失败`);
  }
}

/**
 * 创建笔记本
 */
async function cmdNotebookCreate(url, token, name, options) {
  if (!name) {
    console.error("错误: 请指定笔记本名称");
    console.error("用法: node skill.js notebook create <name>");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/notebook/createNotebook", { name });
    console.log(`✅ 笔记本已创建: ${name}`);
    console.log(`   ID: ${data.id || data}`);
  } catch (error) {
    handleError(error, `创建笔记本 ${name} 失败`);
  }
}

/**
 * 笔记本命令路由
 */
async function cmdNotebook(url, token, subCmd, args, options) {
  switch (subCmd) {
    case "ls":
    case "list":
      await cmdNotebookLs(url, token, options);
      break;

    case "create":
      await cmdNotebookCreate(url, token, args[0], options);
      break;

    case "open":
      if (!args[0]) {
        console.error("错误: 请指定笔记本 ID");
        console.error("用法: node skill.js notebook open <notebook-id>");
        process.exit(1);
      }
      await cmdNotebookOpen(url, token, args[0], options);
      break;

    case "close":
      if (!args[0]) {
        console.error("错误: 请指定笔记本 ID");
        console.error("用法: node skill.js notebook close <notebook-id>");
        process.exit(1);
      }
      await cmdNotebookClose(url, token, args[0], options);
      break;

    case "conf":
      if (!args[0]) {
        console.error("错误: 请指定笔记本 ID");
        console.error("用法: node skill.js notebook conf <notebook-id>");
        process.exit(1);
      }
      await cmdNotebookConf(url, token, args[0], options);
      break;

    default:
      console.error(`错误: 未知笔记本子命令: ${subCmd}`);
      console.error("可用子命令: ls, create, open, close, conf");
      process.exit(1);
  }
}

module.exports = { cmdNotebook };
