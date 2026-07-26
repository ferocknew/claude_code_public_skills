/**
 * draw.io API 客户端
 * 与私有化部署的 draw.io 服务交互
 */

const fs = require("fs");
const path = require("path");

const SKILL_VERSION = "1.0.0";

function loadDotEnv(baseDir) {
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

function getConfig() {
  return {
    url: process.env.DRAWIO_URL || "http://localhost:8080",
    rejectUnauthorized: process.env.DRAWIO_REJECT_UNAUTHORIZED !== "false",
  };
}

function initTls() {
  const config = getConfig();
  if (!config.rejectUnauthorized) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

async function apiRequest(method, urlPath, body, overrides) {
  const config = getConfig();
  const baseUrl = (overrides && overrides.url) || config.url;
  const url = `${baseUrl}${urlPath}`;
  const headers = { "Content-Type": "application/json" };
  const options = {
    method,
    headers,
    signal: AbortSignal.timeout(30000),
  };
  if (body && method !== "GET") {
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("image") || contentType.includes("application/pdf")) {
      const buf = await res.arrayBuffer();
      return { success: true, data: Buffer.from(buf), contentType, status: res.status };
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}`, message: data.message || `请求失败: ${res.status}` };
      }
      return { success: true, data, status: res.status };
    } catch {
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}`, message: text.slice(0, 500) };
      }
      return { success: true, data: text, status: res.status };
    }
  } catch (e) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      return { success: false, error: "请求超时", message: `连接 ${baseUrl} 超时（30s），请检查服务器地址和网络` };
    }
    return { success: false, error: "请求失败", message: e.message };
  }
}

module.exports = { SKILL_VERSION, loadDotEnv, getConfig, initTls, apiRequest };
