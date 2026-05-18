const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "dev";

/**
 * 手写 .env 解析器（无外部依赖）
 */
function loadDotEnv(baseDir) {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(baseDir, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

/**
 * 获取配置
 */
function getConfig() {
  return {
    url: process.env.MIND_MAP_URL || "http://localhost:8086",
    token: process.env.MIND_MAP_API_TOKEN || "",
    rejectUnauthorized: process.env.MIND_MAP_REJECT_UNAUTHORIZED !== "false",
  };
}

/**
 * 初始化 HTTPS 证书设置
 */
function initTls() {
  const config = getConfig();
  if (!config.rejectUnauthorized) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

/**
 * 通用 API 请求
 * @param {string} method - HTTP 方法 (GET/POST)
 * @param {string} path - API 路径 (如 /api/mind-map/status)
 * @param {object} [body] - POST 请求体
 * @param {object} [overrides] - 配置覆盖 ({ url, token })
 * @returns {Promise<object>} API 响应或错误对象
 */
async function apiRequest(method, path, body, overrides) {
  const config = getConfig();
  const baseUrl = (overrides && overrides.url) || config.url;
  const token = (overrides && overrides.token !== undefined) ? overrides.token : config.token;

  const url = `${baseUrl}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
    signal: AbortSignal.timeout(15000),
  };
  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: `HTTP ${res.status}`,
        message: data.error || data.message || `请求失败: ${res.status}`,
      };
    }

    return data;
  } catch (e) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      return { success: false, error: "请求超时", message: `连接 ${baseUrl} 超时（15s），请检查服务器地址和网络` };
    }
    return { success: false, error: "请求失败", message: e.message };
  }
}

module.exports = { SKILL_VERSION, loadDotEnv, getConfig, initTls, apiRequest };
