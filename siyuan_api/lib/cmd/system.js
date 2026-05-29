/**
 * 系统命令
 */

const { siyuanPost } = require("../api");
const { handleError } = require("../errors");

/**
 * 获取思源笔记版本
 */
async function cmdSystemVersion(url, token, options) {
  try {
    const data = await siyuanPost(url, token, "/api/system/version");
    console.log(`思源笔记版本: ${data}`);
  } catch (error) {
    handleError(error, "获取系统版本失败");
  }
}

/**
 * 获取当前时间
 */
async function cmdSystemTime(url, token, options) {
  try {
    const data = await siyuanPost(url, token, "/api/system/currentTime");
    const ts = typeof data === "number" ? data : parseInt(data);
    if (!isNaN(ts)) {
      const date = new Date(ts);
      console.log(`服务器时间: ${date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`);
      console.log(`时间戳: ${ts}`);
    } else {
      console.log(`服务器时间: ${data}`);
    }
  } catch (error) {
    handleError(error, "获取服务器时间失败");
  }
}

/**
 * 获取启动进度
 */
async function cmdSystemBoot(url, token, options) {
  try {
    const data = await siyuanPost(url, token, "/api/system/bootProgress");
    const progress = data.progress || data;
    const details = data.details || "";

    if (typeof progress === "number" && progress >= 100) {
      console.log(`启动状态: 已就绪 (${progress}%)`);
    } else {
      console.log(`启动进度: ${progress}%`);
      if (details) {
        console.log(`详情: ${details}`);
      }
    }
  } catch (error) {
    handleError(error, "获取启动进度失败");
  }
}

/**
 * 系统命令路由
 */
async function cmdSystem(url, token, subCmd, args, options) {
  switch (subCmd) {
    case "version":
      await cmdSystemVersion(url, token, options);
      break;

    case "time":
      await cmdSystemTime(url, token, options);
      break;

    case "boot":
      await cmdSystemBoot(url, token, options);
      break;

    default:
      console.error(`错误: 未知系统子命令: ${subCmd}`);
      console.error("可用子命令: version, time, boot");
      process.exit(1);
  }
}

module.exports = { cmdSystem };
