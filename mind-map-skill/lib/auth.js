const { apiRequest, getConfig, saveUserIdToEnv } = require("./api");
const { execSync } = require("child_process");

/**
 * 授权命令：生成授权码 → 打开浏览器 → 轮询获取 userId → 写入 .env
 * @param {object} opts - { url (覆盖) }
 * @param {string} baseDir - .env 所在目录
 */
async function cmdAuth(opts, baseDir) {
  const config = getConfig();
  const baseUrl = (opts && opts.url) || config.url;

  // 如果已有 userId，先提示
  if (config.userId) {
    console.log(JSON.stringify({
      status: "already_authorized",
      userId: config.userId,
      message: `已绑定 userId: ${config.userId}，如需重新授权请先删除 .env 中的 MIND_MAP_USER_ID`,
    }, null, 2));
    return { success: true, alreadyAuthorized: true, userId: config.userId };
  }

  // 1. 请求服务端生成授权码
  console.error("[Auth] 正在生成授权码...");
  const codeResult = await apiRequest("POST", "/api/mind-map/auth/code", null, { url: baseUrl });

  if (!codeResult.code) {
    return {
      success: false,
      error: "生成授权码失败",
      message: codeResult.error || codeResult.message || "服务器未返回授权码",
    };
  }

  const code = codeResult.code;
  const authUrl = `${baseUrl}/#/auth?code=${code}`;

  console.error(`[Auth] 授权码: ${code}`);
  console.error(`[Auth] 请在浏览器中确认授权: ${authUrl}`);

  // 2. 尝试打开浏览器
  try {
    const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    execSync(`${openCmd} "${authUrl}"`, { stdio: "ignore" });
    console.error("[Auth] 已打开浏览器授权页面");
  } catch (e) {
    console.error(`[Auth] 无法自动打开浏览器，请手动访问: ${authUrl}`);
  }

  // 3. 轮询等待用户确认（最多 5 分钟）
  const POLL_INTERVAL_MS = 2000;
  const MAX_POLL_MS = 5 * 60 * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const pollResult = await apiRequest("GET", `/api/mind-map/auth/poll?code=${code}`, null, { url: baseUrl });

    if (pollResult.ready && pollResult.userId) {
      // 4. 写入 .env
      saveUserIdToEnv(baseDir, pollResult.userId);
      console.error(`[Auth] 授权成功! userId: ${pollResult.userId}`);
      return {
        success: true,
        userId: pollResult.userId,
        message: `已绑定 userId: ${pollResult.userId}，已写入 .env`,
      };
    }

    if (pollResult.error && !pollResult.error.includes("过期")) {
      // 继续轮询（还没确认）
      continue;
    }

    // 授权码过期
    if (pollResult.error && pollResult.error.includes("过期")) {
      return {
        success: false,
        error: "授权码已过期",
        message: "请在 5 分钟内完成授权确认",
      };
    }
  }

  return {
    success: false,
    error: "授权超时",
    message: "5 分钟内未完成授权确认",
  };
}

module.exports = { cmdAuth };
