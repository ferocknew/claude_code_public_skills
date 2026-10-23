/**
 * 命令行参数解析
 *
 * 支持形式：
 *   --key value          普通选项
 *   --key=value          内联值
 *   --flag               布尔开关（不吞下一个 token）
 *   --no-xxx             等价于 --xxx=false
 *   -h / -v / -q / -f    单字母别名
 *   --                   其后全部视为位置参数
 *
 * 选项名统一转 camelCase：--max-tokens -> maxTokens、--document-id -> documentId。
 */

const { usageError } = require("./errors");

// 单字母别名
const SHORT_ALIASES = {
  h: "help",
  v: "version",
  q: "query",
  f: "format",
};

// 布尔开关：后面不跟值时不会吞掉下一个 token
const BOOLEAN_OPTIONS = new Set([
  "help",
  "version",
  "prefer-observations",
  "restore",
  "no-resolve-entities",
]);

// 可省略值的布尔选项：仅当下一个 token 是布尔字面量时才消费
const OPTIONAL_BOOLEAN_OPTIONS = new Set(["resolve-entities"]);

// 全部合法选项（camelCase）
const KNOWN_OPTIONS = new Set([
  "help",
  "version",
  "format",
  "dotenv-file",
  "url",
  "token",
  "context",
  "timestamp",
  "tags",
  "metadata",
  "document-id",
  "strategy",
  "update-mode",
  "content-file",
  "max-tokens",
  "budget",
  "types",
  "prefer-observations",
  "tags-match",
  "tag-groups",
  "query-timestamp",
  "min-scores",
  "temporal-window",
  "type",
  "query",
  "limit",
  "offset",
  "text",
  "occurred-start",
  "occurred-end",
  "fact-type",
  "entities",
  "resolve-entities",
  "no-resolve-entities",
  "reason",
  "restore",
  "args",
  "args-file",
]);

/**
 * 选项名归一化：连字符转驼峰
 * @param {string} raw 不含前导 - 的选项名
 * @returns {string}
 */
function normalizeName(raw) {
  return String(raw).replace(/-([a-z0-9])/gi, (_, ch) => ch.toUpperCase());
}

// 归一化后的合法选项（同时兼容 --max-tokens 与 --maxTokens 两种拼写）
const KNOWN_NORMALIZED = new Set([...KNOWN_OPTIONS].map(normalizeName));

/**
 * 判断是否为布尔字面量
 * @param {*} value
 * @returns {boolean}
 */
function isBoolLiteral(value) {
  return /^(true|false|1|0|yes|no|y|n|on|off)$/i.test(String(value).trim());
}

/**
 * 解析布尔值
 * @param {*} value
 * @param {string} name 选项名（用于报错）
 * @returns {boolean}
 */
function toBool(value, name) {
  if (typeof value === "boolean") return value;
  const s = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;
  throw usageError(`${name} 需要布尔值（true/false、1/0、yes/no），当前：${value}`);
}

/**
 * 解析整数
 * @param {*} value
 * @param {string} name 选项名
 * @param {{min?:number,max?:number}} [range]
 * @returns {number}
 */
function toInt(value, name, range) {
  const limits = range || {};
  const n = Number(value);
  if (value === true || value === "" || value === undefined || value === null || !Number.isInteger(n)) {
    throw usageError(`${name} 必须是整数，当前：${value}`);
  }
  if (limits.min !== undefined && n < limits.min) {
    throw usageError(`${name} 不能小于 ${limits.min}，当前：${n}`);
  }
  if (limits.max !== undefined && n > limits.max) {
    throw usageError(`${name} 不能大于 ${limits.max}，当前：${n}`);
  }
  return n;
}

/**
 * 解析 JSON 选项
 * @param {*} value
 * @param {string} name 选项名
 * @returns {*}
 */
function parseJsonOption(value, name) {
  if (typeof value !== "string") throw usageError(`${name} 需要 JSON 字符串`);
  try {
    return JSON.parse(value);
  } catch (e) {
    throw usageError(`${name} 不是合法 JSON：${e.message}`);
  }
}

/**
 * 解析 JSON 对象选项（数组 / 标量一律拒绝）
 * @param {*} value
 * @param {string} name
 * @returns {Object}
 */
function parseJsonObjectOption(value, name) {
  const parsed = parseJsonOption(value, name);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw usageError(`${name} 需要 JSON 对象，例如 {"key":"value"}`);
  }
  return parsed;
}

/**
 * 逗号分隔列表 -> 字符串数组
 * @param {*} value
 * @param {string} name
 * @returns {string[]}
 */
function splitCsv(value, name) {
  if (typeof value !== "string") throw usageError(`${name} 需要逗号分隔的字符串`);
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length === 0) throw usageError(`${name} 不能为空`);
  return items;
}

/**
 * 枚举校验
 * @param {*} value
 * @param {string} name
 * @param {string[]} allowed
 * @returns {string}
 */
function oneOf(value, name, allowed) {
  const text = String(value).trim();
  if (!allowed.includes(text)) {
    throw usageError(`${name} 取值非法：${text}（可选 ${allowed.join(" / ")}）`);
  }
  return text;
}

/**
 * 解析 argv
 * @param {string[]} argv process.argv.slice(2)
 * @returns {{command:string|null,positionals:string[],options:Object,unknown:string[]}}
 */
function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const options = {};
  const positionals = [];
  const unknown = [];
  let command = null;
  let i = 0;

  while (i < args.length) {
    const token = String(args[i]);

    if (token === "--") {
      const rest = args.slice(i + 1).map(String);
      if (command === null && rest.length) {
        command = rest[0];
        positionals.push(...rest.slice(1));
      } else {
        positionals.push(...rest);
      }
      break;
    }

    if (token.startsWith("-") && token !== "-") {
      let body = token.replace(/^-+/, "");
      let inline;
      const eq = body.indexOf("=");
      if (eq !== -1) {
        inline = body.slice(eq + 1);
        body = body.slice(0, eq);
      }

      const negated = body.startsWith("no-") && body.length > 3;
      const rawName = negated ? body.slice(3) : body;
      const aliased = SHORT_ALIASES[rawName] || rawName;
      const name = normalizeName(aliased);

      if (!KNOWN_OPTIONS.has(aliased) && !KNOWN_NORMALIZED.has(name)) {
        unknown.push(token);
      }

      if (negated) {
        options[name] = inline === undefined ? false : !toBool(inline, token);
        i += 1;
      } else if (inline !== undefined) {
        options[name] = BOOLEAN_OPTIONS.has(rawName) || OPTIONAL_BOOLEAN_OPTIONS.has(rawName)
          ? toBool(inline, token)
          : inline;
        i += 1;
      } else if (BOOLEAN_OPTIONS.has(rawName)) {
        options[name] = true;
        i += 1;
      } else if (OPTIONAL_BOOLEAN_OPTIONS.has(rawName)) {
        const next = args[i + 1];
        if (next !== undefined && isBoolLiteral(next)) {
          options[name] = toBool(next, token);
          i += 2;
        } else {
          options[name] = true;
          i += 1;
        }
      } else {
        const next = args[i + 1];
        // 单独一个 "-" 是合法值（表示从标准输入读取），不能当成选项
        if (next === undefined || (String(next).startsWith("-") && String(next) !== "-")) {
          // 缺值：置 true，由命令层的类型校验给出明确中文报错
          options[name] = true;
          i += 1;
        } else {
          options[name] = String(next);
          i += 2;
        }
      }
      continue;
    }

    if (command === null) {
      command = token;
    } else {
      positionals.push(token);
    }
    i += 1;
  }

  return { command, positionals, options, unknown };
}

module.exports = {
  parseArgs,
  normalizeName,
  isBoolLiteral,
  toBool,
  toInt,
  parseJsonOption,
  parseJsonObjectOption,
  splitCsv,
  oneOf,
  SHORT_ALIASES,
  BOOLEAN_OPTIONS,
  OPTIONAL_BOOLEAN_OPTIONS,
  KNOWN_OPTIONS,
};
