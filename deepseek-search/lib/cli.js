/**
 * 命令行参数解析
 *
 * - 逐个 token 扫描，以 - 开头的视为选项
 * - 选项名归一化：去前导 -/--、单字母别名展开、连字符转驼峰（ori-question -> oriQuestion）
 * - 布尔开关不吞下一个 token（--content 后面跟的 query 不会被误吃）
 */

// 单字母别名
const SHORT_ALIASES = {
  n: "count",
  k: "apiKey", // -k 与 --api-key 等价（config set-key 另有 --key，且同样接受 -k 传入的值）
  f: "format",
  o: "out",
  h: "help",
  v: "version",
  t: "timeout",
};

// 布尔开关（不吞下一个 token）
const BOOLEAN_FLAGS = new Set([
  "help",
  "version",
  "json",
  "raw",
  "content",
  "stdin",
  "dryRun",
  "noInput",
]);

/**
 * 归一化选项名
 * @param {string} token 形如 -n / --ori-question
 * @returns {{name:string,inlineValue?:string}}
 */
function normalizeOption(token) {
  let body = token.replace(/^-+/, "");
  let inlineValue;
  const eqIdx = body.indexOf("=");
  if (eqIdx !== -1) {
    inlineValue = body.slice(eqIdx + 1);
    body = body.slice(0, eqIdx);
  }
  const alias = SHORT_ALIASES[body];
  const dashed = alias || body;
  const name = dashed.replace(/-(.)/g, (m, ch) => ch.toUpperCase());
  return { name, inlineValue };
}

/**
 * 解析 argv
 * @param {string[]} argv process.argv.slice(2)
 * @returns {{command:string|null,positionals:string[],opts:object,unknown:string[]}}
 */
function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const opts = {};
  const positionals = [];
  const unknown = [];
  let command = null;
  let i = 0;

  while (i < args.length) {
    const token = String(args[i]);
    if (token.startsWith("-") && token !== "-") {
      const { name, inlineValue } = normalizeOption(token);
      const next = args[i + 1];
      if (inlineValue !== undefined) {
        opts[name] = BOOLEAN_FLAGS.has(name) ? toBool(inlineValue) : inlineValue;
        i += 1;
      } else if (BOOLEAN_FLAGS.has(name)) {
        opts[name] = true;
        i += 1;
      } else if (next !== undefined && !String(next).startsWith("-")) {
        opts[name] = String(next);
        i += 2;
      } else {
        opts[name] = true;
        i += 1;
      }
      if (!KNOWN_OPTIONS.has(name)) unknown.push(token);
    } else if (command === null) {
      command = token;
      i += 1;
    } else {
      positionals.push(token);
      i += 1;
    }
  }

  // --dotenv-file 是本工具的别名：Node 20.6+ 会在启动时拦截 --env-file
  // （文件不存在直接退出 9，文件存在则预先注入 process.env），因此提供一个
  // 不与 Node 内置选项冲突的拼写，供「文件还不存在」等场景使用。
  if (opts.dotenvFile && !opts.envFile) opts.envFile = opts.dotenvFile;

  return { command, positionals, opts, unknown };
}

// 全局选项（--help 展示的集合）
const KNOWN_OPTIONS = new Set([
  "apiKey",
  "envFile",
  "dotenvFile",
  "format",
  "json",
  "timeout",
  "noInput",
  "dryRun",
  "stdin",
  "help",
  "version",
  "count",
  "content",
  "oriQuestion",
  "localization",
  "raw",
  "out",
  "key",
]);

/**
 * 解析整数
 * @param {any} v
 * @param {string} name 选项名（用于报错文案）
 * @param {{min?:number,max?:number}} [range]
 * @returns {number|{error:string,message:string}}
 */
function toInt(v, name, range) {
  const options = range || {};
  const n = Number(v);
  if (v === true || v === "" || v === undefined || v === null || !Number.isFinite(n) || !Number.isInteger(n)) {
    return { error: "参数错误", message: `${name} 必须是整数` };
  }
  if (options.min !== undefined && n < options.min) {
    return { error: "参数错误", message: `${name} 不能小于 ${options.min}` };
  }
  if (options.max !== undefined && n > options.max) {
    return { error: "参数错误", message: `${name} 不能大于 ${options.max}` };
  }
  return n;
}

/**
 * 解析布尔值（true/false/1/0/yes/no），失败返回错误对象，不抛异常
 * @param {any} v
 * @returns {boolean|{error:string,message:string}}
 */
function toBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") {
    if (v === 1) return true;
    if (v === 0) return false;
  }
  const s = String(v === undefined || v === null ? "" : v).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;
  return { error: "参数错误", message: `布尔值不合法：${v}（可用 true/false、1/0、yes/no）` };
}

const KNOWN_FORMATS = ["table", "json", "markdown"];

/**
 * 校验通用选项
 * @param {object} opts
 * @param {{countMin?:number,countMax?:number}} [defaults]
 * @returns {{count:number,format:string,opts:object}|{error:string,message:string}}
 */
function validateCommonOpts(opts, defaults) {
  const options = opts || {};
  const range = defaults || {};

  let count = 10;
  if (options.count !== undefined && options.count !== null) {
    const parsed = toInt(options.count, "--count");
    if (typeof parsed !== "number") return parsed;
    count = parsed;
  }
  if (count < 1 || count > 50) {
    return { error: "参数错误", message: "--count 必须是 1~50 的整数" };
  }

  let format = options.format || (options.json ? "json" : "table");
  if (options.format !== undefined) {
    const bool = toBool(options.format);
    if (typeof bool === "boolean") {
      // 兼容 --format=true/false：true 视为 json，false 视为 table
      format = bool ? "json" : "table";
    }
  }
  if (!KNOWN_FORMATS.includes(format)) {
    return {
      error: "参数错误",
      message: `--format 必须是 ${KNOWN_FORMATS.join(" / ")} 之一（当前：${format}）`,
    };
  }

  return { count, format, opts: options };
}

module.exports = {
  parseArgs,
  toInt,
  toBool,
  validateCommonOpts,
  normalizeOption,
  KNOWN_OPTIONS,
  SHORT_ALIASES,
  BOOLEAN_FLAGS,
  KNOWN_FORMATS,
};
