/**
 * config 命令：查看 / 写入本地配置
 *
 * 该命令不需要 API Key，也不会触发任何交互式询问（避免阻塞脚本与 CI）。
 *
 * node skill.js config                      查看当前生效的配置（Key 只显示掩码）
 * node skill.js config show                 同上
 * node skill.js config path                 只输出 .env 绝对路径
 * node skill.js config set-key <key>        写入 .env（也可用 --key / --stdin）
 * node skill.js config --env-file <path> set-key <key>   写入指定文件
 */

const fs = require("fs");
const { loadDotEnv, saveApiKeyToFile, validateApiKey, getBaseUrl, getTimeoutMs } = require("../api");
const { resolveApiKey, getEnvFilePath } = require("../env");
const { makeError, printError, EXIT_CODES } = require("../errors");

/** Key 掩码：前 3 + **** + 后 4 */
function maskKey(key) {
  if (!key) return null;
  if (key.length <= 7) return key[0] + "****";
  return `${key.slice(0, 3)}****${key.slice(-4)}`;
}

/** 读取 stdin 全文 */
function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buf += chunk;
    });
    process.stdin.on("end", () => resolve(buf.trim()));
    process.stdin.on("error", () => resolve(buf.trim()));
  });
}

/** 解析本次要操作的 .env 完整路径（--env-file 优先） */
function targetEnvFile(opts, ctx) {
  const options = opts || {};
  const context = ctx || {};
  return getEnvFilePath({ envFile: options.envFile, skillDir: context.skillDir });
}

/**
 * 从 .env 文件里读某个 key 的值（纯读取，不改动 process.env）
 * 仅用于把 source 显示准确：run.js 启动时已把 .env 载入 process.env，
 * 若不比对文件，来自 .env 的 key 会被笼统显示成 "env"。
 */
function readEnvValueFromFile(envFilePath, name) {
  try {
    if (!fs.existsSync(envFilePath)) return null;
    for (const line of fs.readFileSync(envFilePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      if (trimmed.slice(0, eqIdx).trim() === name) return trimmed.slice(eqIdx + 1).trim();
    }
  } catch (e) {
    return null;
  }
  return null;
}

/** 判定 key 的真实来源 */
function detectSource(resolved, envFile) {
  if (!resolved.apiKey || resolved.source === "cli") return resolved.source;
  const fileKey = readEnvValueFromFile(envFile, "DEEPSEEK_API_KEY");
  return fileKey && fileKey === resolved.apiKey ? "envFile" : resolved.source;
}

/** show 子命令：不触发询问，缺 Key 时直接返回 apiKey: null */
function showConfig(opts, ctx) {
  const options = opts || {};
  const envFile = targetEnvFile(options, ctx);
  // 一并传 skillDir，保证「显式文件里没有 key」时能回退到 <skillDir>/.env
  const resolved = resolveApiKey({ envFile, skillDir: (ctx || {}).skillDir });
  const payload = {
    apiKey: maskKey(resolved.apiKey),
    source: detectSource(resolved, envFile),
    envFile,
    envFileExists: fs.existsSync(envFile),
    baseUrl: getBaseUrl(),
    timeoutMs: getTimeoutMs(),
  };
  console.log(JSON.stringify(payload, null, 2));
  return EXIT_CODES.OK;
}

/** set-key 子命令：写入 getEnvFilePath 解析出的那个文件 */
async function setKey(positionals, opts, ctx) {
  const options = opts || {};
  const context = ctx || {};

  let key = positionals && positionals[1] ? String(positionals[1]).trim() : "";
  // --key 是 config 专用选项；-k / --api-key 与全局一致，这里一并接受
  if (!key && typeof options.key === "string") key = options.key.trim();
  if (!key && typeof options.apiKey === "string") key = options.apiKey.trim();
  if (!key && options.stdin) key = await readStdin();

  if (!key) {
    printError(
      makeError(
        "参数错误",
        "set-key 需要提供 API Key：node skill.js config set-key sk-xxxx\n" +
          "也可使用 --key sk-xxxx（或 -k / --api-key sk-xxxx），或用 --stdin 从标准输入读取"
      )
    );
    return EXIT_CODES.USAGE;
  }

  const check = validateApiKey(key);
  if (!check.ok) {
    printError(makeError("参数错误", `API Key 不合法：${check.message}`));
    return EXIT_CODES.USAGE;
  }

  // 先加载已有配置，避免覆盖用户已设置的环境变量
  loadDotEnv(context.skillDir);

  const envFile = targetEnvFile(options, context);
  const saved = saveApiKeyToFile(envFile, key);
  console.log(
    JSON.stringify(
      {
        saved: true,
        path: saved.path,
        message: `已写入 ${saved.path}（该文件已被 .gitignore 忽略，不会提交）`,
      },
      null,
      2
    )
  );
  return EXIT_CODES.OK;
}

/**
 * @param {string[]} positionals positionals[0] 为子命令
 * @param {object} opts
 * @param {{skillDir:string,envFile?:string}} ctx
 * @returns {Promise<number>} 退出码
 */
async function cmdConfig(positionals, opts, ctx) {
  const sub = positionals && positionals[0] ? String(positionals[0]) : "show";

  if (sub === "show") return showConfig(opts, ctx);
  if (sub === "path") {
    console.log(targetEnvFile(opts, ctx));
    return EXIT_CODES.OK;
  }
  if (sub === "set-key") return setKey(positionals, opts, ctx);

  printError(
    makeError("参数错误", `config 不支持子命令：${sub}（可用：show / path / set-key）`)
  );
  return EXIT_CODES.USAGE;
}

module.exports = { cmdConfig, maskKey, targetEnvFile, readEnvValueFromFile, detectSource };
