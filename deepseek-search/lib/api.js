/**
 * DeepSeek Search / Fetch API 封装
 *
 * 官方文档: https://api-docs.deepseek.com/zh-cn/guides/search
 * - Search: POST /v1/tools/search  按 query 搜索网页
 * - Fetch:  POST /v1/tools/fetch   抓取单个网页，返回 Markdown 正文
 *
 * 鉴权: Authorization: Bearer <DeepSeek API Key>
 * 计费: 每 1000 次成功请求 5 元；失败 / 无结果不计费
 *
 * 本模块零运行时依赖，仅使用 Node.js 18+ 内置能力。
 * 安全约定：API Key 只从环境变量或 .env 读取，绝不硬编码、绝不打印到 stdout。
 */

const fs = require("fs");
const path = require("path");

const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "dev";
const BASE_URL = "https://api.deepseek.com";
const SEARCH_PATH = "/v1/tools/search";
const FETCH_PATH = "/v1/tools/fetch";
const DEFAULT_TIMEOUT_MS = 30000;

// Search 的 count 取值范围（官方文档：1～50）
const COUNT_MIN = 1;
const COUNT_MAX = 50;

/**
 * 解析 .env 文本为键值对象（纯函数，不写入 process.env）
 * @param {string} content
 * @returns {Record<string,string>}
 */
function parseEnvText(content) {
  const values = {};
  if (typeof content !== "string" || !content) return values;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) values[key] = val;
  }
  return values;
}

/**
 * 读取 .env 文件的键值对（纯读取，不改动 process.env；文件不存在返回空对象）
 * @param {string} envFilePath
 * @returns {Record<string,string>}
 */
function readEnvFileValues(envFilePath) {
  try {
    if (!envFilePath || !fs.existsSync(envFilePath)) return {};
    return parseEnvText(fs.readFileSync(envFilePath, "utf8"));
  } catch (e) {
    return {};
  }
}

/**
 * 手写 .env 解析（无依赖）：把文本写入 process.env，已存在的键不覆盖
 * @param {string} content
 */
function applyEnvText(content) {
  const values = parseEnvText(content);
  for (const [key, val] of Object.entries(values)) {
    if (!process.env[key]) process.env[key] = val;
  }
}

/**
 * 加载 <baseDir>/.env
 * @param {string} baseDir 目录
 */
function loadDotEnv(baseDir) {
  const envPath = path.join(baseDir, ".env");
  if (!fs.existsSync(envPath)) return;
  applyEnvText(fs.readFileSync(envPath, "utf8"));
}

/**
 * 按「完整文件路径」加载 .env（--env-file 场景，路径本身即文件）
 * @param {string} envFilePath
 */
function loadEnvFile(envFilePath) {
  if (!envFilePath || !fs.existsSync(envFilePath)) return;
  applyEnvText(fs.readFileSync(envFilePath, "utf8"));
}

/**
 * 读取 API Key（空串视为未设置）
 * @returns {string|null}
 */
function getApiKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  return trimmed ? trimmed : null;
}

/**
 * 「真实环境变量」快照
 *
 * run.js 启动时会把 <skillDir>/.env 注入 process.env，注入之后就无法再区分
 * 「用户 shell 传入的环境变量」与「我们自己从默认 .env 注入的值」，
 * 会让显式 --env-file 被默认 .env 遮蔽。因此在模块加载（早于任何 loadDotEnv
 * 调用）时记录一次快照，供 resolveApiKey 判定优先级使用。
 */
const AMBIENT_API_KEY = (() => {
  const raw = process.env.DEEPSEEK_API_KEY;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
})();

/**
 * 取「真实环境变量」中的 API Key（不含本工具注入的 .env 值）
 * @returns {string|null}
 */
function getAmbientApiKey() {
  return AMBIENT_API_KEY;
}

/**
 * 读取 Base URL（去掉结尾的 /）
 * @returns {string}
 */
function getBaseUrl() {
  const raw = process.env.DEEPSEEK_BASE_URL;
  const base = typeof raw === "string" && raw.trim() ? raw.trim() : BASE_URL;
  return base.replace(/\/+$/, "");
}

/**
 * 读取超时时间（毫秒），非法值回退默认 30000
 * @returns {number}
 */
function getTimeoutMs() {
  const raw = Number(process.env.DEEPSEEK_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_TIMEOUT_MS;
}

/**
 * API Key 缺失时的统一错误（含中文配置指引）
 * @returns {{error:string,message:string}}
 */
function missingKeyError() {
  return {
    error: "API Key 缺失",
    message:
      "未检测到 DeepSeek API Key（DEEPSEEK_API_KEY）\n\n" +
      "请先在 https://platform.deepseek.com/api_keys 创建 API Key，然后任选一种方式配置：\n" +
      "  (a) 交互式终端下首次运行本 skill 会主动询问，输入后自动保存；\n" +
      "  (b) 手动写入 deepseek-search/.env：DEEPSEEK_API_KEY=sk-xxxx；\n" +
      "  (c) 设置环境变量：export DEEPSEEK_API_KEY=sk-xxxx；\n" +
      "  (d) 单次传入：node skill.js search \"关键词\" --api-key sk-xxxx",
  };
}

/**
 * 校验 Key 格式（仅做本地格式检查，不发起网络请求）
 * @param {string} key
 * @returns {{ok:true}|{ok:false,message:string}}
 */
function validateApiKey(key) {
  if (typeof key !== "string" || !key.trim()) {
    return { ok: false, message: "API Key 不能为空" };
  }
  const trimmed = key.trim();
  if (trimmed.length < 8) {
    return { ok: false, message: "API Key 长度不足（至少 8 个字符），请检查是否复制完整" };
  }
  if (/\s/.test(trimmed)) {
    return { ok: false, message: "API Key 不能包含空格或换行，请检查是否复制完整" };
  }
  return { ok: true };
}

/**
 * 是否已配置 API Key
 * @returns {boolean}
 */
function hasApiKey() {
  return getApiKey() !== null;
}

/**
 * 将 API Key 写入/更新到 <baseDir>/.env
 * - 保留文件中的其他行与注释
 * - 文件不存在时创建，并写入头部注释
 * - 写入后尽力设置权限 0600（Windows 上忽略失败）
 * - 绝不把 key 打印到 stdout
 *
 * @param {string} baseDir
 * @param {string} key
 * @returns {{path:string,created:boolean}}
 */
function saveApiKeyToFile(envPath, key) {
  const created = !fs.existsSync(envPath);
  const header = "# DeepSeek Search Skill 本地配置（已被 .gitignore 忽略，请勿提交）";
  const keyLine = `DEEPSEEK_API_KEY=${String(key).trim()}`;

  let lines;
  if (created) {
    lines = [header];
  } else {
    lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    // 去掉末尾空行，便于统一拼接
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    if (!lines.length) lines = [header];
  }

  let replaced = false;
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return line;
    if (trimmed.slice(0, eqIdx).trim() !== "DEEPSEEK_API_KEY") return line;
    if (replaced) return null; // 清理重复行
    replaced = true;
    return keyLine;
  });
  if (!replaced) out.push(keyLine);

  fs.writeFileSync(envPath, out.filter((l) => l !== null).join("\n") + "\n", "utf8");

  try {
    fs.chmodSync(envPath, 0o600);
  } catch (e) {
    // Windows 等平台不支持 chmod，忽略
  }

  return { path: envPath, created };
}

/**
 * 将 API Key 写入/更新到 <baseDir>/.env（目录形式）
 * @param {string} baseDir
 * @param {string} key
 * @returns {{path:string,created:boolean}}
 */
function saveApiKey(baseDir, key) {
  return saveApiKeyToFile(path.join(baseDir, ".env"), key);
}

/**
 * 从错误响应体中提取 error.message
 * @param {string} text
 * @returns {string|null}
 */
function parseErrorMessage(text) {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    const msg = parsed && parsed.error && parsed.error.message;
    return typeof msg === "string" && msg.trim() ? msg.trim() : null;
  } catch (e) {
    return null;
  }
}

/**
 * 按 HTTP 状态码映射中文错误
 * @param {number} status
 * @param {string|null} detail 服务端返回的 error.message
 * @returns {string}
 */
function httpErrorMessage(status, detail) {
  if (status === 401) return "API Key 无效";
  if (status === 402) return "余额不足";
  if (status === 403) return "请求被安全策略拒绝";
  if (status === 404) return "未能获取可用的网页内容";
  if (status === 429) {
    return "超过 QPS 限制（Search/Fetch 各 5 QPS，按账号计），请稍后重试";
  }
  if (status >= 500 || status === 408 || status === 504) {
    return "服务端错误或超时，请稍后重试";
  }
  return detail || `请求失败（HTTP ${status}）`;
}

/**
 * 发起一次 DeepSeek 工具接口请求
 *
 * @param {string} reqPath 形如 /v1/tools/search
 * @param {object} body 请求体
 * @param {{apiKey:string,baseUrl?:string,timeoutMs?:number}} opts
 * @returns {Promise<{ok:true,data:any}|{ok:false,error:string,message:string,status?:number}>}
 */
async function deepseekRequest(reqPath, body, opts) {
  const options = opts || {};
  const apiKey = options.apiKey;
  const baseUrl = (options.baseUrl || getBaseUrl()).replace(/\/+$/, "");
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
    ? Number(options.timeoutMs)
    : getTimeoutMs();

  if (!apiKey) return missingKeyError();

  let res;
  try {
    res = await fetch(`${baseUrl}${reqPath}`, {
      method: "POST",
      headers: {
        // Key 只出现在请求头中，绝不进入 stdout / 日志
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    return {
      ok: false,
      error: "请求失败",
      message: `连接 ${baseUrl} 失败：${e.message}`,
    };
  }

  const text = typeof res.text === "function" ? await res.text().catch(() => "") : "";

  if (!res.ok) {
    const detail = parseErrorMessage(text);
    return {
      ok: false,
      error: "接口调用失败",
      message: httpErrorMessage(res.status, detail),
      status: res.status,
    };
  }

  try {
    return { ok: true, data: JSON.parse(text || "{}") };
  } catch (e) {
    return { ok: false, error: "响应解析失败", message: `服务端返回的内容不是合法 JSON：${e.message}` };
  }
}

/**
 * 网页搜索
 *
 * body 只包含「已提供」的字段，未提供的字段不会出现在请求体中。
 *
 * @param {string} query 搜索词（1～128 字符）
 * @param {{apiKey:string,baseUrl?:string,timeoutMs?:number,count?:number,oriQuestion?:string,localization?:string,needContent?:boolean}} opts
 * @returns {Promise<{ok:true,data:any}|{ok:false,error:string,message:string,status?:number}>}
 */
async function searchWeb(query, opts) {
  const options = opts || {};
  const body = { query };
  if (options.count !== undefined && options.count !== null) body.count = Number(options.count);
  // ori_question 为空视为未提供，不传该字段（官方：传 null 视为未提供）
  if (typeof options.oriQuestion === "string" && options.oriQuestion.trim()) {
    body.ori_question = options.oriQuestion.trim();
  }
  if (typeof options.localization === "string" && options.localization.trim()) {
    body.localization = options.localization.trim();
  }
  if (options.needContent !== undefined && options.needContent !== null) {
    body.need_content = Boolean(options.needContent);
  }
  return deepseekRequest(SEARCH_PATH, body, options);
}

/**
 * 抓取单个网页（返回 Markdown 正文）
 * @param {string} url 含 host 的 HTTP/HTTPS 地址
 * @param {{apiKey:string,baseUrl?:string,timeoutMs?:number}} opts
 */
async function fetchPage(url, opts) {
  return deepseekRequest(FETCH_PATH, { url }, opts || {});
}

module.exports = {
  SKILL_VERSION,
  BASE_URL,
  SEARCH_PATH,
  FETCH_PATH,
  DEFAULT_TIMEOUT_MS,
  COUNT_MIN,
  COUNT_MAX,
  loadDotEnv,
  loadEnvFile,
  parseEnvText,
  readEnvFileValues,
  getApiKey,
  getAmbientApiKey,
  getBaseUrl,
  getTimeoutMs,
  missingKeyError,
  validateApiKey,
  hasApiKey,
  saveApiKey,
  saveApiKeyToFile,
  deepseekRequest,
  searchWeb,
  fetchPage,
};
