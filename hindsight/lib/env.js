/**
 * 环境变量与 .env 解析
 *
 * 配置优先级：命令行选项 > 真实环境变量 > .env 文件 > 默认值。
 * .env 查找顺序：--dotenv-file 指定的文件 -> 当前工作目录/.env -> skill 目录/.env。
 *
 * 已存在的环境变量一律不覆盖（loadDotEnv 约定），因此真实环境变量优先级高于文件。
 * 本模块不打印任何配置值，尤其是 token。
 */

const fs = require("fs");
const path = require("path");
const { configError } = require("./errors");

const DEFAULT_TIMEOUT_MS = 60000;

/**
 * 解析 .env 文本（支持 # 注释、export 前缀、单双引号包裹）
 * @param {string} text
 * @returns {Object<string,string>}
 */
function parseEnvText(text) {
  const values = {};
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const matched = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!matched) continue;
    const key = matched[1];
    let value = matched[2].trim();
    const quoted = value.match(/^(['"])([\s\S]*)\1$/);
    if (quoted) value = quoted[2];
    values[key] = value;
  }
  return values;
}

/**
 * 载入一个 .env 文件（已存在的环境变量不覆盖）
 * @param {string} file 绝对路径
 * @returns {boolean} 是否实际读取
 */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return false;
  const values = parseEnvText(fs.readFileSync(file, "utf8"));
  for (const [key, value] of Object.entries(values)) {
    // 已存在的环境变量（包括显式置空）一律不覆盖，便于用空值临时屏蔽 .env 配置
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

/**
 * 按优先级载入 .env
 * @param {{dotenvFile?:string,cwd?:string,skillDir:string}} options
 * @returns {string[]} 实际载入的文件列表
 */
function loadEnvFiles(options) {
  const opts = options || {};
  const cwd = opts.cwd || process.cwd();
  const skillDir = opts.skillDir || path.join(__dirname, "..");

  const candidates = [];
  if (opts.dotenvFile) {
    const file = path.resolve(String(opts.dotenvFile));
    if (!fs.existsSync(file)) {
      throw configError(
        `--dotenv-file 指定的文件不存在：${file}`,
        "请确认路径正确；不指定该选项时默认读取当前目录/.env 与 skill 目录/.env"
      );
    }
    candidates.push(file);
  } else {
    candidates.push(path.join(cwd, ".env"));
    candidates.push(path.join(skillDir, ".env"));
  }

  const loaded = [];
  const seen = new Set();
  for (const file of candidates) {
    if (seen.has(file)) continue;
    seen.add(file);
    if (loadEnvFile(file)) loaded.push(file);
  }
  return loaded;
}

/**
 * 解析超时毫秒数，非法值回退默认值
 * @param {*} raw
 * @returns {number}
 */
function parseTimeout(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TIMEOUT_MS;
}

/**
 * 解析 MCP 端点与认证配置
 *
 * 认证两种方式，二选一即可：
 *   1. HINDSIGHT_AUTH_HEADER：整串作为 Authorization 头（优先）
 *   2. HINDSIGHT_TOKEN：自动拼成 "Bearer <token>"
 *
 * @param {Object} cliOptions 命令行选项（url / token / dotenvFile）
 * @param {{skillDir:string,cwd?:string}} paths
 * @returns {{url:string,authorization:string,timeoutMs:number,envFiles:string[]}}
 */
function resolveConfig(cliOptions, paths) {
  const options = cliOptions || {};
  const locations = paths || {};
  const envFiles = loadEnvFiles({
    dotenvFile: options.dotenvFile,
    cwd: locations.cwd,
    skillDir: locations.skillDir,
  });

  const rawUrl = String(options.url || process.env.HINDSIGHT_MCP_URL || "").trim();
  if (!rawUrl) {
    throw configError(
      "缺少 HINDSIGHT_MCP_URL：需要完整的 MCP 端点 URL（已包含 /mcp/<bank>）",
      "请在本 skill 目录的 .env 中配置（参考 .env.example），或设置同名环境变量"
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (_) {
    throw configError(
      `HINDSIGHT_MCP_URL 不是合法 URL：${rawUrl}`,
      "应形如 https://example.com/mcp/your-bank"
    );
  }
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw configError(
      `HINDSIGHT_MCP_URL 仅支持 http/https，当前协议：${parsedUrl.protocol}`,
      "应形如 https://example.com/mcp/your-bank"
    );
  }

  const authHeader = String(process.env.HINDSIGHT_AUTH_HEADER || "").trim();
  const token = String(options.token || process.env.HINDSIGHT_TOKEN || "").trim();
  const authorization = authHeader || (token ? `Bearer ${token}` : "");

  if (!authorization) {
    throw configError(
      "缺少 HINDSIGHT_TOKEN：没有可用的认证信息",
      "请配置 HINDSIGHT_TOKEN（或直接配置完整的 HINDSIGHT_AUTH_HEADER），参考 .env.example"
    );
  }

  return {
    url: rawUrl,
    authorization,
    timeoutMs: parseTimeout(process.env.HINDSIGHT_TIMEOUT_MS),
    envFiles,
  };
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  parseEnvText,
  loadEnvFile,
  loadEnvFiles,
  parseTimeout,
  resolveConfig,
};
