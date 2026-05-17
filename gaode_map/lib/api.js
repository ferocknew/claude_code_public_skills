const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "dev";
const BASE_URL = "https://restapi.amap.com/v3";

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

function getApiKey() {
  return process.env.AMAP_API_KEY || null;
}

function apiKeyMissingError() {
  return {
    error: "API Key 缺失",
    message:
      "未检测到高德地图 API Key\n\n" +
      "请按照以下步骤配置：\n" +
      "  1. 访问 https://lbs.amap.com/ 注册账号\n" +
      "  2. 创建应用，获取 Web服务 API Key\n" +
      "  3. 设置环境变量：export AMAP_API_KEY='your_key'\n" +
      "  4. 或运行时：AMAP_API_KEY=your_key node skill.js <command>",
  };
}

async function amapGet(path, params) {
  const apiKey = getApiKey();
  if (!apiKey) return apiKeyMissingError();

  const url = new URL(path, BASE_URL);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    return await res.json();
  } catch (e) {
    return { error: "请求失败", message: e.message };
  }
}

module.exports = { SKILL_VERSION, BASE_URL, loadDotEnv, getApiKey, amapGet };
