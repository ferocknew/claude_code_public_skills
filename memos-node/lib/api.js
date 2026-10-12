/**
 * Memos REST API 底层封装
 *
 * - 认证：Authorization: Bearer <token>（Memos 个人访问令牌）
 * - 基地址：https://<你的实例>，API 前缀固定 /api/v1
 * - 错误响应：{ code, message, details }，HTTP 状态码与 gRPC code 对应
 *
 * 配置优先级：命令行 --url/--token > 环境变量 > 同目录 .env > 默认值
 */

const fs = require("fs");
const path = require("path");

// 版本号（打包时由 build.js 通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "0.0.1-dev";

// Memos 官方默认监听端口
const DEFAULT_URL = "http://localhost:5230";
const DEFAULT_TIMEOUT = 30000;

/**
 * 读取同目录 .env（已存在的环境变量不覆盖）
 * 打包后 __dirname 为 skill 根目录；源码运行时 __dirname 为 lib/，需回退一级
 */
function loadDotEnv() {
  const candidates = [
    path.join(__dirname, ".env"),
    path.join(__dirname, "..", ".env"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
    break;
  }
}

/**
 * 解析运行配置
 * @param {Object} [options] 命令行选项
 * @returns {{baseUrl: string, token: string, timeout: number, insecure: boolean}}
 */
function getConfig(options = {}) {
  loadDotEnv();

  const insecure = !!(options.insecure || process.env.MEMOS_INSECURE === "true");
  if (insecure) {
    // Node 内置 fetch 无法按请求关闭证书校验，只能进程级放开
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const baseUrl = String(options.url || process.env.MEMOS_URL || DEFAULT_URL).replace(/\/+$/, "");
  const token = String(options.token || process.env.MEMOS_TOKEN || process.env.MEMOS_API_TOKEN || "");

  return {
    baseUrl,
    token,
    timeout: parseInt(options.timeout || process.env.MEMOS_TIMEOUT || String(DEFAULT_TIMEOUT), 10),
    insecure,
  };
}

/**
 * 把对象拼成查询串，跳过 undefined/null/空字符串
 * @param {Object} query
 * @returns {string} 形如 "?a=1&b=2"，无参数时返回空串
 */
function buildQuery(query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

/**
 * 解析 Memos 的错误响应体，生成可读消息
 * @param {number} status HTTP 状态码
 * @param {string} text 响应正文
 * @returns {{message: string, code: number|null}}
 */
function parseError(status, text) {
  let message = text;
  let code = null;
  try {
    const body = JSON.parse(text);
    if (body && typeof body === "object" && body.message) {
      message = body.message;
      code = body.code ?? null;
    }
  } catch (_) {
    // 非 JSON 响应，沿用原始文本
  }
  return { message: message || `HTTP ${status}`, code };
}

/**
 * 发起 Memos API 请求
 * @param {string} method HTTP 方法
 * @param {string} urlPath API 路径，形如 "/api/v1/memos"
 * @param {Object} [opts]
 * @param {Object} [opts.query] 查询参数
 * @param {Object} [opts.body] JSON 请求体
 * @param {Object} [opts.config] 已解析的配置，省略则用 getConfig()
 * @param {string} [opts.accept] 期望的响应类型：json（默认）| text | buffer
 * @param {string} [opts.rawPath] 完全替换的 URL 路径（用于 /file/ 这类非 API 路径）
 * @returns {Promise<any>}
 */
async function apiRequest(method, urlPath, opts = {}) {
  const config = opts.config || getConfig();
  const url = `${config.baseUrl}${urlPath}${buildQuery(opts.query)}`;

  const headers = { Accept: "application/json" };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;

  let payload;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout);

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(`请求超时（${config.timeout}ms）：${method} ${url}`);
    }
    throw new Error(`请求失败：${e.message}`);
  } finally {
    clearTimeout(timer);
  }

  const accept = opts.accept || "json";

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const { message, code } = parseError(res.status, text);
    const err = new Error(message);
    err.status = res.status;
    err.grpcCode = code;
    err.method = method;
    err.url = url;
    throw err;
  }

  if (accept === "buffer") return Buffer.from(await res.arrayBuffer());
  if (accept === "text") return await res.text();

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
}

/**
 * 把用户输入的各种 memo 标识统一成裸 uid
 * 支持：裸 uid、memos/uid、https://<实例>/m/<uid>、https://<实例>/memos/uid
 * @param {string} input
 * @returns {string}
 */
function normalizeMemoUid(input) {
  if (!input) return "";
  let value = String(input).trim();

  // 完整 URL：取路径最后一段
  if (/^https?:\/\//i.test(value)) {
    try {
      const segments = new URL(value).pathname.split("/").filter(Boolean);
      value = segments[segments.length - 1] || "";
    } catch (_) {
      // 解析失败则按原样处理
    }
  }

  if (value.startsWith("memos/")) value = value.slice("memos/".length);
  return value;
}

module.exports = {
  SKILL_VERSION,
  DEFAULT_URL,
  getConfig,
  buildQuery,
  apiRequest,
  normalizeMemoUid,
};
