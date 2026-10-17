/**
 * 环境与 API Key 解析
 *
 * 单一实现来源：.env 解析复用 lib/api.js 的 applyEnvText / loadDotEnv / loadEnvFile。
 * 安全约定：Key 只输出掩码，绝不完整打印；本模块不直接输出错误（由调用方统一 printError）。
 */

const path = require("path");
const readline = require("readline");
const { Writable } = require("stream");
const {
  loadDotEnv,
  loadEnvFile,
  readEnvFileValues,
  getApiKey,
  getAmbientApiKey,
  validateApiKey,
} = require("./api");

/**
 * 转发 api.js 的 .env 解析实现（目录形式）
 * @param {string} baseDir
 */
function loadDotEnvDir(baseDir) {
  return loadDotEnv(baseDir);
}

/**
 * 解析 .env 文件路径（绝对路径，指向「文件」而不是目录）
 *
 * 支持三种入参：
 *   getEnvFilePath("C:/x/real.env")            -> 该文件
 *   getEnvFilePath({ envFile: "C:/x/real.env" }) -> 该文件（--env-file）
 *   getEnvFilePath({ skillDir })                -> <skillDir>/.env
 *   getEnvFilePath()                            -> <skillDir>/.env（开发模式下的 ../.env）
 *
 * @param {string|{envFile?:string,skillDir?:string}} [opts]
 * @returns {string}
 */
function getEnvFilePath(opts) {
  if (typeof opts === "string") return path.resolve(opts);
  const options = opts || {};
  if (options.envFile) return path.resolve(String(options.envFile));
  if (options.skillDir) return path.join(String(options.skillDir), ".env");
  return path.join(__dirname, "..", ".env");
}

/** DEEPSEEK_NO_PROMPT 真值判断 */
function isTruthyEnv(v) {
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s !== "" && s !== "0" && s !== "false" && s !== "no" && s !== "off";
}

/**
 * 解析生效的 API Key
 *
 * 优先级（高 → 低）：
 *   1. --api-key / -k（cli，单次使用）
 *   2. 真实环境变量 DEEPSEEK_API_KEY（env，不含本工具注入的 .env 值）
 *   3. --env-file 显式指定的文件（envFile，按文件内容直接解析，不受默认 .env 影响）
 *   4. <skillDir>/.env（envFile，run.js 启动时已载入；未指定 --env-file 时的回退）
 *
 * 注意第 3 步：run.js 启动即把默认 .env 注入 process.env，而 .env 载入是「已存在不覆盖」，
 * 因此显式 --env-file 必须直接读文件内容，否则永远被默认 .env 遮蔽。
 *
 * 返回值：
 *   { apiKey, source: "cli" | "env" | "envFile" | "none", envFile, invalid? }
 *   invalid 仅在 --api-key 格式非法时出现；此时 apiKey 为 null，
 *   调用方应直接以用法错误退出（EXIT_CODES.USAGE），不要进入交互询问。
 *
 * @param {{apiKey?:string,envFile?:string,skillDir?:string}|string} [opts]
 * @returns {{apiKey:string|null,source:string,envFile:string,invalid?:string}}
 */
function resolveApiKey(opts) {
  const options = typeof opts === "string" ? { envFile: opts } : opts || {};
  const explicitEnvFile =
    typeof options.envFile === "string" && options.envFile.trim()
      ? path.resolve(options.envFile.trim())
      : null;
  const envFile = explicitEnvFile || getEnvFilePath(options);

  // 0) 显式 --env-file：先把该文件的全部变量载入（已存在的键不覆盖）。
  //    必须在 key 分支之前做：否则 key 来自 --api-key 时，文件里的
  //    DEEPSEEK_BASE_URL / DEEPSEEK_TIMEOUT_MS 会被整段跳过，导致请求打到默认端点。
  if (explicitEnvFile) loadEnvFile(explicitEnvFile);

  // 1) 命令行显式传入（单次使用，不落盘）
  if (typeof options.apiKey === "string" && options.apiKey.trim()) {
    const key = options.apiKey.trim();
    const check = validateApiKey(key);
    if (check.ok) return { apiKey: key, source: "cli", envFile };
    return { apiKey: null, source: "cli", invalid: check.message, envFile };
  }

  // 2) 真实环境变量（run.js 载入默认 .env 之前的快照），优先级高于任何 .env 文件
  const ambient = getAmbientApiKey();
  if (ambient) return { apiKey: ambient, source: "env", envFile };

  // 3) 显式 --env-file：直接解析该文件，不受已注入的默认 .env 影响
  if (explicitEnvFile) {
    const fileValues = readEnvFileValues(explicitEnvFile);
    const fileKey =
      typeof fileValues.DEEPSEEK_API_KEY === "string" && fileValues.DEEPSEEK_API_KEY.trim()
        ? fileValues.DEEPSEEK_API_KEY.trim()
        : null;
    if (fileKey) {
      return { apiKey: fileKey, source: "envFile", envFile };
    }
  }

  // 4) 回退：默认 <skillDir>/.env
  //    - 未指定 --env-file 时，这就是主路径（run.js 启动时已载入，这里再做一次幂等兜底）
  //    - 指定了 --env-file 但文件里没有 key 时，也回退到这里（文件缺失同样如此）
  const defaultEnvDir = options.skillDir || path.join(__dirname, "..");
  loadDotEnv(defaultEnvDir);
  const fromEnv = getApiKey();
  if (fromEnv) return { apiKey: fromEnv, source: "envFile", envFile };

  return { apiKey: null, source: "none", envFile };
}

/** 仅把换行透传给真实输出，用于 TTY 下隐藏输入（readline 回显被吞掉） */
function createMaskedOutput(output) {
  return new Writable({
    write(chunk, encoding, callback) {
      const text = chunk.toString();
      if (text.includes("\n")) output.write("\n");
      callback();
    },
  });
}

/**
 * 首次使用时主动询问 API Key
 *
 * 返回值约定（简单字符串，便于调用方区分）：
 *   { status: "key",    apiKey }            询问成功，可保存并继续
 *   { status: "skip" }                      直接回车跳过 / 非交互环境，调用方按缺 Key 处理
 *   { status: "invalid", message }          输入格式不合法，调用方原样报错（退出码 2）
 *
 * @param {{noInput?:boolean}} [opts]
 * @returns {Promise<{status:string,apiKey?:string,message?:string}>}
 */
async function askForApiKey(opts) {
  const options = opts || {};
  // 只有 --no-input / DEEPSEEK_NO_PROMPT（或 stdin 已关闭）才跳过询问。
  // 注意：stdin 是管道且仍有数据时，readline 会把管道内容读走并询问，因此
  // 「要用 stdin 传查询词」的场景必须在调用前就避免走到这里（见 run.js 的 --stdin 分支）。
  if (isTruthyEnv(process.env.DEEPSEEK_NO_PROMPT) || options.noInput) {
    return { status: "skip" };
  }

  const output = process.stdout;
  const isTTY = Boolean(process.stdin.isTTY && output.isTTY);

  const rl = readline.createInterface({
    input: process.stdin,
    output: isTTY ? createMaskedOutput(output) : output,
    terminal: isTTY,
  });

  try {
    const answer = await new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      rl.question(
        "未检测到 DEEPSEEK_API_KEY。\n" +
          "请输入你的 DeepSeek API Key（platform.deepseek.com/api_keys 获取，直接回车跳过）：",
        (value) => done(value)
      );
      // 输入被关闭（如 stdin 直接结束）时也结束等待，避免挂起
      rl.once("close", () => done(""));
    });

    const key = String(answer || "").trim();
    if (!key) return { status: "skip" };
    const check = validateApiKey(key);
    if (!check.ok) return { status: "invalid", message: check.message };
    return { status: "key", apiKey: key };
  } finally {
    rl.close();
  }
}

module.exports = {
  loadDotEnv: loadDotEnvDir,
  loadEnvFile,
  getEnvFilePath,
  resolveApiKey,
  askForApiKey,
  validateApiKey,
};
