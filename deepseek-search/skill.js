#!/usr/bin/env node
// DeepSeek 网页搜索与抓取工具 v261017.194057 - 无需安装依赖
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/api.js
var require_api = __commonJS({
  "lib/api.js"(exports2, module2) {
    var fs = require("fs");
    var path2 = require("path");
    var SKILL_VERSION2 = true ? "261017.194057" : "dev";
    var BASE_URL2 = "https://api.deepseek.com";
    var SEARCH_PATH = "/v1/tools/search";
    var FETCH_PATH = "/v1/tools/fetch";
    var DEFAULT_TIMEOUT_MS = 3e4;
    var COUNT_MIN = 1;
    var COUNT_MAX = 50;
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
    function readEnvFileValues(envFilePath) {
      try {
        if (!envFilePath || !fs.existsSync(envFilePath)) return {};
        return parseEnvText(fs.readFileSync(envFilePath, "utf8"));
      } catch (e) {
        return {};
      }
    }
    function applyEnvText(content) {
      const values = parseEnvText(content);
      for (const [key, val] of Object.entries(values)) {
        if (!process.env[key]) process.env[key] = val;
      }
    }
    function loadDotEnv2(baseDir) {
      const envPath = path2.join(baseDir, ".env");
      if (!fs.existsSync(envPath)) return;
      applyEnvText(fs.readFileSync(envPath, "utf8"));
    }
    function loadEnvFile(envFilePath) {
      if (!envFilePath || !fs.existsSync(envFilePath)) return;
      applyEnvText(fs.readFileSync(envFilePath, "utf8"));
    }
    function getApiKey() {
      const key = process.env.DEEPSEEK_API_KEY;
      if (typeof key !== "string") return null;
      const trimmed = key.trim();
      return trimmed ? trimmed : null;
    }
    var AMBIENT_API_KEY = (() => {
      const raw = process.env.DEEPSEEK_API_KEY;
      if (typeof raw !== "string") return null;
      const trimmed = raw.trim();
      return trimmed ? trimmed : null;
    })();
    function getAmbientApiKey() {
      return AMBIENT_API_KEY;
    }
    function getBaseUrl2() {
      const raw = process.env.DEEPSEEK_BASE_URL;
      const base = typeof raw === "string" && raw.trim() ? raw.trim() : BASE_URL2;
      return base.replace(/\/+$/, "");
    }
    function getTimeoutMs2() {
      const raw = Number(process.env.DEEPSEEK_TIMEOUT_MS);
      if (Number.isFinite(raw) && raw > 0) return raw;
      return DEFAULT_TIMEOUT_MS;
    }
    function missingKeyError2() {
      return {
        error: "API Key \u7F3A\u5931",
        message: '\u672A\u68C0\u6D4B\u5230 DeepSeek API Key\uFF08DEEPSEEK_API_KEY\uFF09\n\n\u8BF7\u5148\u5728 https://platform.deepseek.com/api_keys \u521B\u5EFA API Key\uFF0C\u7136\u540E\u4EFB\u9009\u4E00\u79CD\u65B9\u5F0F\u914D\u7F6E\uFF1A\n  (a) \u4EA4\u4E92\u5F0F\u7EC8\u7AEF\u4E0B\u9996\u6B21\u8FD0\u884C\u672C skill \u4F1A\u4E3B\u52A8\u8BE2\u95EE\uFF0C\u8F93\u5165\u540E\u81EA\u52A8\u4FDD\u5B58\uFF1B\n  (b) \u624B\u52A8\u5199\u5165 deepseek-search/.env\uFF1ADEEPSEEK_API_KEY=sk-xxxx\uFF1B\n  (c) \u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF\uFF1Aexport DEEPSEEK_API_KEY=sk-xxxx\uFF1B\n  (d) \u5355\u6B21\u4F20\u5165\uFF1Anode skill.js search "\u5173\u952E\u8BCD" --api-key sk-xxxx'
      };
    }
    function validateApiKey(key) {
      if (typeof key !== "string" || !key.trim()) {
        return { ok: false, message: "API Key \u4E0D\u80FD\u4E3A\u7A7A" };
      }
      const trimmed = key.trim();
      if (trimmed.length < 8) {
        return { ok: false, message: "API Key \u957F\u5EA6\u4E0D\u8DB3\uFF08\u81F3\u5C11 8 \u4E2A\u5B57\u7B26\uFF09\uFF0C\u8BF7\u68C0\u67E5\u662F\u5426\u590D\u5236\u5B8C\u6574" };
      }
      if (/\s/.test(trimmed)) {
        return { ok: false, message: "API Key \u4E0D\u80FD\u5305\u542B\u7A7A\u683C\u6216\u6362\u884C\uFF0C\u8BF7\u68C0\u67E5\u662F\u5426\u590D\u5236\u5B8C\u6574" };
      }
      return { ok: true };
    }
    function hasApiKey() {
      return getApiKey() !== null;
    }
    function saveApiKeyToFile2(envPath, key) {
      const created = !fs.existsSync(envPath);
      const header = "# DeepSeek Search Skill \u672C\u5730\u914D\u7F6E\uFF08\u5DF2\u88AB .gitignore \u5FFD\u7565\uFF0C\u8BF7\u52FF\u63D0\u4EA4\uFF09";
      const keyLine = `DEEPSEEK_API_KEY=${String(key).trim()}`;
      let lines;
      if (created) {
        lines = [header];
      } else {
        lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
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
        if (replaced) return null;
        replaced = true;
        return keyLine;
      });
      if (!replaced) out.push(keyLine);
      fs.writeFileSync(envPath, out.filter((l) => l !== null).join("\n") + "\n", "utf8");
      try {
        fs.chmodSync(envPath, 384);
      } catch (e) {
      }
      return { path: envPath, created };
    }
    function saveApiKey(baseDir, key) {
      return saveApiKeyToFile2(path2.join(baseDir, ".env"), key);
    }
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
    function httpErrorMessage(status, detail) {
      if (status === 401) return "API Key \u65E0\u6548";
      if (status === 402) return "\u4F59\u989D\u4E0D\u8DB3";
      if (status === 403) return "\u8BF7\u6C42\u88AB\u5B89\u5168\u7B56\u7565\u62D2\u7EDD";
      if (status === 404) return "\u672A\u80FD\u83B7\u53D6\u53EF\u7528\u7684\u7F51\u9875\u5185\u5BB9";
      if (status === 429) {
        return "\u8D85\u8FC7 QPS \u9650\u5236\uFF08Search/Fetch \u5404 5 QPS\uFF0C\u6309\u8D26\u53F7\u8BA1\uFF09\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5";
      }
      if (status >= 500 || status === 408 || status === 504) {
        return "\u670D\u52A1\u7AEF\u9519\u8BEF\u6216\u8D85\u65F6\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5";
      }
      return detail || `\u8BF7\u6C42\u5931\u8D25\uFF08HTTP ${status}\uFF09`;
    }
    async function deepseekRequest(reqPath, body, opts) {
      const options = opts || {};
      const apiKey = options.apiKey;
      const baseUrl = (options.baseUrl || getBaseUrl2()).replace(/\/+$/, "");
      const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : getTimeoutMs2();
      if (!apiKey) return missingKeyError2();
      let res;
      try {
        res = await fetch(`${baseUrl}${reqPath}`, {
          method: "POST",
          headers: {
            // Key 只出现在请求头中，绝不进入 stdout / 日志
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body || {}),
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (e) {
        return {
          ok: false,
          error: "\u8BF7\u6C42\u5931\u8D25",
          message: `\u8FDE\u63A5 ${baseUrl} \u5931\u8D25\uFF1A${e.message}`
        };
      }
      const text = typeof res.text === "function" ? await res.text().catch(() => "") : "";
      if (!res.ok) {
        const detail = parseErrorMessage(text);
        return {
          ok: false,
          error: "\u63A5\u53E3\u8C03\u7528\u5931\u8D25",
          message: httpErrorMessage(res.status, detail),
          status: res.status
        };
      }
      try {
        return { ok: true, data: JSON.parse(text || "{}") };
      } catch (e) {
        return { ok: false, error: "\u54CD\u5E94\u89E3\u6790\u5931\u8D25", message: `\u670D\u52A1\u7AEF\u8FD4\u56DE\u7684\u5185\u5BB9\u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e.message}` };
      }
    }
    async function searchWeb(query, opts) {
      const options = opts || {};
      const body = { query };
      if (options.count !== void 0 && options.count !== null) body.count = Number(options.count);
      if (typeof options.oriQuestion === "string" && options.oriQuestion.trim()) {
        body.ori_question = options.oriQuestion.trim();
      }
      if (typeof options.localization === "string" && options.localization.trim()) {
        body.localization = options.localization.trim();
      }
      if (options.needContent !== void 0 && options.needContent !== null) {
        body.need_content = Boolean(options.needContent);
      }
      return deepseekRequest(SEARCH_PATH, body, options);
    }
    async function fetchPage(url, opts) {
      return deepseekRequest(FETCH_PATH, { url }, opts || {});
    }
    module2.exports = {
      SKILL_VERSION: SKILL_VERSION2,
      BASE_URL: BASE_URL2,
      SEARCH_PATH,
      FETCH_PATH,
      DEFAULT_TIMEOUT_MS,
      COUNT_MIN,
      COUNT_MAX,
      loadDotEnv: loadDotEnv2,
      loadEnvFile,
      parseEnvText,
      readEnvFileValues,
      getApiKey,
      getAmbientApiKey,
      getBaseUrl: getBaseUrl2,
      getTimeoutMs: getTimeoutMs2,
      missingKeyError: missingKeyError2,
      validateApiKey,
      hasApiKey,
      saveApiKey,
      saveApiKeyToFile: saveApiKeyToFile2,
      deepseekRequest,
      searchWeb,
      fetchPage
    };
  }
});

// lib/env.js
var require_env = __commonJS({
  "lib/env.js"(exports2, module2) {
    var path2 = require("path");
    var readline = require("readline");
    var { Writable } = require("stream");
    var {
      loadDotEnv: loadDotEnv2,
      loadEnvFile,
      readEnvFileValues,
      getApiKey,
      getAmbientApiKey,
      validateApiKey
    } = require_api();
    function loadDotEnvDir(baseDir) {
      return loadDotEnv2(baseDir);
    }
    function getEnvFilePath2(opts) {
      if (typeof opts === "string") return path2.resolve(opts);
      const options = opts || {};
      if (options.envFile) return path2.resolve(String(options.envFile));
      if (options.skillDir) return path2.join(String(options.skillDir), ".env");
      return path2.join(__dirname, "..", ".env");
    }
    function isTruthyEnv(v) {
      if (typeof v !== "string") return false;
      const s = v.trim().toLowerCase();
      return s !== "" && s !== "0" && s !== "false" && s !== "no" && s !== "off";
    }
    function resolveApiKey2(opts) {
      const options = typeof opts === "string" ? { envFile: opts } : opts || {};
      const explicitEnvFile = typeof options.envFile === "string" && options.envFile.trim() ? path2.resolve(options.envFile.trim()) : null;
      const envFile = explicitEnvFile || getEnvFilePath2(options);
      if (explicitEnvFile) loadEnvFile(explicitEnvFile);
      if (typeof options.apiKey === "string" && options.apiKey.trim()) {
        const key = options.apiKey.trim();
        const check = validateApiKey(key);
        if (check.ok) return { apiKey: key, source: "cli", envFile };
        return { apiKey: null, source: "cli", invalid: check.message, envFile };
      }
      const ambient = getAmbientApiKey();
      if (ambient) return { apiKey: ambient, source: "env", envFile };
      if (explicitEnvFile) {
        const fileValues = readEnvFileValues(explicitEnvFile);
        const fileKey = typeof fileValues.DEEPSEEK_API_KEY === "string" && fileValues.DEEPSEEK_API_KEY.trim() ? fileValues.DEEPSEEK_API_KEY.trim() : null;
        if (fileKey) {
          return { apiKey: fileKey, source: "envFile", envFile };
        }
      }
      const defaultEnvDir = options.skillDir || path2.join(__dirname, "..");
      loadDotEnv2(defaultEnvDir);
      const fromEnv = getApiKey();
      if (fromEnv) return { apiKey: fromEnv, source: "envFile", envFile };
      return { apiKey: null, source: "none", envFile };
    }
    function createMaskedOutput(output) {
      return new Writable({
        write(chunk, encoding, callback) {
          const text = chunk.toString();
          if (text.includes("\n")) output.write("\n");
          callback();
        }
      });
    }
    async function askForApiKey2(opts) {
      const options = opts || {};
      if (isTruthyEnv(process.env.DEEPSEEK_NO_PROMPT) || options.noInput) {
        return { status: "skip" };
      }
      const output = process.stdout;
      const isTTY = Boolean(process.stdin.isTTY && output.isTTY);
      const rl = readline.createInterface({
        input: process.stdin,
        output: isTTY ? createMaskedOutput(output) : output,
        terminal: isTTY
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
            "\u672A\u68C0\u6D4B\u5230 DEEPSEEK_API_KEY\u3002\n\u8BF7\u8F93\u5165\u4F60\u7684 DeepSeek API Key\uFF08platform.deepseek.com/api_keys \u83B7\u53D6\uFF0C\u76F4\u63A5\u56DE\u8F66\u8DF3\u8FC7\uFF09\uFF1A",
            (value) => done(value)
          );
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
    module2.exports = {
      loadDotEnv: loadDotEnvDir,
      loadEnvFile,
      getEnvFilePath: getEnvFilePath2,
      resolveApiKey: resolveApiKey2,
      askForApiKey: askForApiKey2,
      validateApiKey
    };
  }
});

// lib/cli.js
var require_cli = __commonJS({
  "lib/cli.js"(exports2, module2) {
    var SHORT_ALIASES = {
      n: "count",
      k: "apiKey",
      // -k 与 --api-key 等价（config set-key 另有 --key，且同样接受 -k 传入的值）
      f: "format",
      o: "out",
      h: "help",
      v: "version",
      t: "timeout"
    };
    var BOOLEAN_FLAGS = /* @__PURE__ */ new Set([
      "help",
      "version",
      "json",
      "raw",
      "content",
      "stdin",
      "dryRun",
      "noInput"
    ]);
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
    function parseArgs2(argv) {
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
          if (inlineValue !== void 0) {
            opts[name] = BOOLEAN_FLAGS.has(name) ? toBool(inlineValue) : inlineValue;
            i += 1;
          } else if (BOOLEAN_FLAGS.has(name)) {
            opts[name] = true;
            i += 1;
          } else if (next !== void 0 && !String(next).startsWith("-")) {
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
      if (opts.dotenvFile && !opts.envFile) opts.envFile = opts.dotenvFile;
      return { command, positionals, opts, unknown };
    }
    var KNOWN_OPTIONS = /* @__PURE__ */ new Set([
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
      "key"
    ]);
    function toInt2(v, name, range) {
      const options = range || {};
      const n = Number(v);
      if (v === true || v === "" || v === void 0 || v === null || !Number.isFinite(n) || !Number.isInteger(n)) {
        return { error: "\u53C2\u6570\u9519\u8BEF", message: `${name} \u5FC5\u987B\u662F\u6574\u6570` };
      }
      if (options.min !== void 0 && n < options.min) {
        return { error: "\u53C2\u6570\u9519\u8BEF", message: `${name} \u4E0D\u80FD\u5C0F\u4E8E ${options.min}` };
      }
      if (options.max !== void 0 && n > options.max) {
        return { error: "\u53C2\u6570\u9519\u8BEF", message: `${name} \u4E0D\u80FD\u5927\u4E8E ${options.max}` };
      }
      return n;
    }
    function toBool(v) {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") {
        if (v === 1) return true;
        if (v === 0) return false;
      }
      const s = String(v === void 0 || v === null ? "" : v).trim().toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(s)) return true;
      if (["false", "0", "no", "n", "off"].includes(s)) return false;
      return { error: "\u53C2\u6570\u9519\u8BEF", message: `\u5E03\u5C14\u503C\u4E0D\u5408\u6CD5\uFF1A${v}\uFF08\u53EF\u7528 true/false\u30011/0\u3001yes/no\uFF09` };
    }
    var KNOWN_FORMATS = ["table", "json", "markdown"];
    function validateCommonOpts2(opts, defaults) {
      const options = opts || {};
      const range = defaults || {};
      let count = 10;
      if (options.count !== void 0 && options.count !== null) {
        const parsed = toInt2(options.count, "--count");
        if (typeof parsed !== "number") return parsed;
        count = parsed;
      }
      if (count < 1 || count > 50) {
        return { error: "\u53C2\u6570\u9519\u8BEF", message: "--count \u5FC5\u987B\u662F 1~50 \u7684\u6574\u6570" };
      }
      let format = options.format || (options.json ? "json" : "table");
      if (options.format !== void 0) {
        const bool = toBool(options.format);
        if (typeof bool === "boolean") {
          format = bool ? "json" : "table";
        }
      }
      if (!KNOWN_FORMATS.includes(format)) {
        return {
          error: "\u53C2\u6570\u9519\u8BEF",
          message: `--format \u5FC5\u987B\u662F ${KNOWN_FORMATS.join(" / ")} \u4E4B\u4E00\uFF08\u5F53\u524D\uFF1A${format}\uFF09`
        };
      }
      return { count, format, opts: options };
    }
    module2.exports = {
      parseArgs: parseArgs2,
      toInt: toInt2,
      toBool,
      validateCommonOpts: validateCommonOpts2,
      normalizeOption,
      KNOWN_OPTIONS,
      SHORT_ALIASES,
      BOOLEAN_FLAGS,
      KNOWN_FORMATS
    };
  }
});

// lib/errors.js
var require_errors = __commonJS({
  "lib/errors.js"(exports2, module2) {
    var EXIT_CODES2 = {
      OK: 0,
      // 成功
      USAGE: 2,
      // 用法错误（参数不合法）
      API: 1,
      // 接口调用失败
      NO_KEY: 3
      // 缺少 API Key
    };
    function makeError2(error, message, extra) {
      return Object.assign({ error, message }, extra || {});
    }
    function printError2(errObj) {
      console.log(JSON.stringify(errObj, null, 2));
    }
    module2.exports = { makeError: makeError2, printError: printError2, EXIT_CODES: EXIT_CODES2 };
  }
});

// lib/output.js
var require_output = __commonJS({
  "lib/output.js"(exports2, module2) {
    var CONTENT_PREVIEW_MAX = 500;
    function truncate(str, max) {
      const s = str === void 0 || str === null ? "" : String(str);
      if (!Number.isFinite(max) || s.length <= max) return s;
      return s.slice(0, max) + "\u2026";
    }
    function displayWidth(str) {
      let width = 0;
      for (const ch of String(str)) {
        width += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(ch) ? 2 : 1;
      }
      return width;
    }
    function padCell(str, width) {
      const s = String(str);
      return s + " ".repeat(Math.max(0, width - displayWidth(s)));
    }
    function shortDate(value) {
      if (typeof value !== "string" || !value.trim()) return "-";
      const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : value.slice(0, 10);
    }
    function authorityText(value) {
      if (value === void 0 || value === null || value === -1) return "-";
      return String(value);
    }
    function scoreText(value) {
      const n = Number(value);
      return Number.isFinite(n) ? n.toFixed(2) : "-";
    }
    function resultsToTable(results) {
      const list = Array.isArray(results) ? results : [];
      const headers = ["\u5E8F\u53F7", "score", "auth", "\u65E5\u671F", "title", "url"];
      const rows = list.map((r, i) => {
        const item = r || {};
        return [
          String(i + 1),
          scoreText(item.rerank_score),
          authorityText(item.authority),
          shortDate(item.date),
          truncate(item.title || "(\u65E0\u6807\u9898)", 60),
          String(item.url || "-")
        ];
      });
      const widths = headers.map(
        (h, i) => Math.max(displayWidth(h), ...rows.map((row) => displayWidth(row[i])))
      );
      const lines = [];
      lines.push(widths.map((wd, i) => padCell(headers[i], wd)).join("  "));
      lines.push(widths.map((wd) => "-".repeat(wd)).join("  "));
      for (const row of rows) {
        lines.push(row.map((cell, i) => padCell(cell, widths[i])).join("  "));
      }
      return lines.join("\n");
    }
    function summaryLine(data) {
      const results = Array.isArray(data && data.results) ? data.results : [];
      const query = data && typeof data.query === "string" ? data.query : "";
      return query ? `\u5171 ${results.length} \u6761\u7ED3\u679C\uFF08query: ${query}\uFF09` : `\u5171 ${results.length} \u6761\u7ED3\u679C`;
    }
    function toMarkdown(data) {
      const results = Array.isArray(data && data.results) ? data.results : [];
      const lines = [`## ${summaryLine(data)}`, ""];
      results.forEach((r, i) => {
        const item = r || {};
        const title = truncate(item.title || "(\u65E0\u6807\u9898)", 60);
        lines.push(`${i + 1}. [${title}](${item.url || "#"})`);
        lines.push(`   - \u65E5\u671F\uFF1A${shortDate(item.date)} \uFF5C \u6743\u5A01\uFF1A${authorityText(item.authority)} \uFF5C \u76F8\u5173\u5206\uFF1A${scoreText(item.rerank_score)}`);
        const summary = item.summary || item.snippet;
        if (summary) lines.push(`   - \u6458\u8981\uFF1A${truncate(summary, 500)}`);
        lines.push("");
      });
      return lines.join("\n").replace(/\n+$/, "");
    }
    function formatResults(data, opts) {
      const options = opts || {};
      const format = options.format || "table";
      if (format === "json") return JSON.stringify(data, null, 2);
      if (format === "markdown") return toMarkdown(data);
      return renderSearchResults(data, { wantContent: Boolean(options.wantContent) });
    }
    function renderSearchResults(data, opts) {
      const wantContent = Boolean(opts && opts.wantContent);
      const results = Array.isArray(data && data.results) ? data.results : [];
      const blocks = [summaryLine(data), "", resultsToTable(results)];
      results.forEach((r, i) => {
        const item = r || {};
        blocks.push("");
        blocks.push(`--- [${i + 1}] ${item.title || "(\u65E0\u6807\u9898)"}`);
        blocks.push(`url: ${item.url || "-"}`);
        blocks.push(`\u65E5\u671F: ${shortDate(item.date)} \uFF5C \u6743\u5A01: ${authorityText(item.authority)} \uFF5C \u76F8\u5173\u5206: ${scoreText(item.rerank_score)}`);
        const summary = item.summary || item.snippet;
        if (summary) blocks.push(`\u6458\u8981: ${truncate(summary, 500)}`);
        const content = typeof item.content === "string" ? item.content : "";
        if (wantContent && content) {
          const clipped = truncate(content, CONTENT_PREVIEW_MAX);
          const note = content.length > CONTENT_PREVIEW_MAX ? "\uFF08\u5185\u5BB9\u8D85\u8FC7 500 \u5B57\u7B26\uFF0C\u5DF2\u622A\u65AD\uFF09" : "";
          blocks.push(`\u6B63\u6587${note}: ${clipped}`);
        }
      });
      return blocks.join("\n");
    }
    function renderFetchResult(data, opts) {
      const options = opts || {};
      const content = typeof (data && data.content) === "string" ? data.content : "";
      if (options.raw) return content;
      const title = data && data.title ? String(data.title) : "(\u65E0\u6807\u9898)";
      return `# ${title}

${content}`;
    }
    module2.exports = {
      formatResults,
      resultsToTable,
      renderSearchResults,
      renderFetchResult,
      truncate,
      shortDate,
      authorityText,
      displayWidth,
      CONTENT_PREVIEW_MAX
    };
  }
});

// lib/cmd/search.js
var require_search = __commonJS({
  "lib/cmd/search.js"(exports2, module2) {
    var { searchWeb } = require_api();
    var { makeError: makeError2, printError: printError2, EXIT_CODES: EXIT_CODES2 } = require_errors();
    var { formatResults } = require_output();
    var QUERY_MAX = 128;
    var ORI_QUESTION_MAX = 128;
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
    function charCount(str) {
      return Array.from(String(str)).length;
    }
    function checkQueryLength2(query) {
      if (charCount(query) > QUERY_MAX) {
        return makeError2(
          "\u53C2\u6570\u9519\u8BEF",
          `\u641C\u7D22\u5173\u952E\u8BCD\u8FC7\u957F\uFF1A${charCount(query)} \u4E2A\u5B57\u7B26\uFF0C\u5B98\u65B9\u9650\u5236 1~${QUERY_MAX} \u4E2A\u5B57\u7B26`
        );
      }
      return null;
    }
    function checkOriQuestion2(oriQuestion) {
      if (oriQuestion && charCount(oriQuestion) > ORI_QUESTION_MAX) {
        return makeError2(
          "\u53C2\u6570\u9519\u8BEF",
          `--ori-question \u8FC7\u957F\uFF1A${charCount(oriQuestion)} \u4E2A\u5B57\u7B26\uFF0C\u5B98\u65B9\u9650\u5236 1~${ORI_QUESTION_MAX} \u4E2A\u5B57\u7B26`
        );
      }
      return null;
    }
    async function cmdSearch2(positionals, opts, ctx) {
      const options = opts || {};
      const context = ctx || {};
      let query = (positionals || []).join(" ").trim();
      if (!query && options.stdin) query = await readStdin();
      if (!query) {
        printError2(
          makeError2(
            "\u53C2\u6570\u9519\u8BEF",
            'search \u547D\u4EE4\u9700\u8981\u5173\u952E\u8BCD\uFF1Anode skill.js search "\u5173\u952E\u8BCD"\uFF08\u6216\u4F7F\u7528 --stdin \u4ECE\u6807\u51C6\u8F93\u5165\u8BFB\u53D6\uFF09'
          )
        );
        return EXIT_CODES2.USAGE;
      }
      const tooLong = checkQueryLength2(query);
      if (tooLong) {
        printError2(tooLong);
        return EXIT_CODES2.USAGE;
      }
      const oriQuestion = typeof options.oriQuestion === "string" && options.oriQuestion.trim() ? options.oriQuestion.trim() : null;
      const oriTooLong = checkOriQuestion2(oriQuestion);
      if (oriTooLong) {
        printError2(oriTooLong);
        return EXIT_CODES2.USAGE;
      }
      const localization = typeof options.localization === "string" && options.localization.trim() ? options.localization.trim() : null;
      const count = context.count || 10;
      const body = { query, count };
      body.need_content = Boolean(options.content);
      if (oriQuestion) body.ori_question = oriQuestion;
      if (localization) body.localization = localization;
      const url = `${context.baseUrl}/v1/tools/search`;
      if (options.dryRun) {
        console.log(JSON.stringify({ dry_run: true, url, body }, null, 2));
        return EXIT_CODES2.OK;
      }
      const res = await searchWeb(query, {
        apiKey: context.apiKey,
        baseUrl: context.baseUrl,
        timeoutMs: context.timeoutMs,
        count,
        oriQuestion,
        localization,
        needContent: Boolean(options.content)
      });
      if (!res.ok) {
        printError2({ error: res.error, message: res.message });
        return EXIT_CODES2.API;
      }
      const results = Array.isArray(res.data && res.data.results) ? res.data.results : [];
      if (!results.length) {
        console.log(
          JSON.stringify(
            { query, count: 0, results: [], message: "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7ED3\u679C\uFF08\u7A7A\u7ED3\u679C\u4E0D\u8BA1\u8D39\uFF09" },
            null,
            2
          )
        );
        return EXIT_CODES2.OK;
      }
      const format = context.format || "table";
      if (format === "json") {
        console.log(formatResults(res.data, { format }));
      } else {
        console.log(
          formatResults(Object.assign({}, res.data, { query }), {
            format,
            wantContent: Boolean(options.content)
          })
        );
      }
      return EXIT_CODES2.OK;
    }
    module2.exports = { cmdSearch: cmdSearch2, checkQueryLength: checkQueryLength2, checkOriQuestion: checkOriQuestion2, charCount, QUERY_MAX, ORI_QUESTION_MAX };
  }
});

// lib/cmd/fetch.js
var require_fetch = __commonJS({
  "lib/cmd/fetch.js"(exports2, module2) {
    var fs = require("fs");
    var path2 = require("path");
    var { fetchPage } = require_api();
    var { makeError: makeError2, printError: printError2, EXIT_CODES: EXIT_CODES2 } = require_errors();
    var { formatResults, renderFetchResult } = require_output();
    var URL_MAX_LENGTH = 8192;
    function validateUrl2(url) {
      if (typeof url !== "string" || !url.trim()) {
        return { ok: false, message: 'fetch \u547D\u4EE4\u9700\u8981 URL\uFF1Anode skill.js fetch "https://example.com/article"' };
      }
      const trimmed = url.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        return { ok: false, message: "URL \u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934" };
      }
      if (trimmed.length > URL_MAX_LENGTH) {
        return { ok: false, message: `URL \u957F\u5EA6\u4E0D\u80FD\u8D85\u8FC7 ${URL_MAX_LENGTH} \u4E2A\u5B57\u7B26\uFF08\u5F53\u524D ${trimmed.length}\uFF09` };
      }
      return { ok: true };
    }
    async function cmdFetch2(positionals, opts, ctx) {
      const options = opts || {};
      const context = ctx || {};
      const rawUrl = (positionals || [])[0];
      const check = validateUrl2(rawUrl);
      if (!check.ok) {
        printError2(makeError2("\u53C2\u6570\u9519\u8BEF", check.message));
        return EXIT_CODES2.USAGE;
      }
      const url = String(rawUrl).trim();
      if (options.dryRun) {
        console.log(
          JSON.stringify(
            { dry_run: true, url: `${context.baseUrl}/v1/tools/fetch`, body: { url } },
            null,
            2
          )
        );
        return EXIT_CODES2.OK;
      }
      const res = await fetchPage(url, {
        apiKey: context.apiKey,
        baseUrl: context.baseUrl,
        timeoutMs: context.timeoutMs
      });
      if (!res.ok) {
        printError2({ error: res.error, message: res.message });
        return EXIT_CODES2.API;
      }
      if (options.out) {
        const outPath = path2.resolve(String(options.out));
        try {
          fs.writeFileSync(outPath, renderFetchResult(res.data, { raw: true }), "utf8");
        } catch (e) {
          printError2(makeError2("\u5199\u5165\u5931\u8D25", `\u65E0\u6CD5\u5199\u5165 ${outPath}\uFF1A${e.message}`));
          return EXIT_CODES2.API;
        }
        const bytes = fs.statSync(outPath).size;
        console.log(JSON.stringify({ saved: outPath, bytes }, null, 2));
        return EXIT_CODES2.OK;
      }
      if (options.json || context.format === "json") {
        console.log(formatResults(res.data, { format: "json" }));
        return EXIT_CODES2.OK;
      }
      console.log(renderFetchResult(res.data, { raw: Boolean(options.raw) }));
      return EXIT_CODES2.OK;
    }
    module2.exports = { cmdFetch: cmdFetch2, validateUrl: validateUrl2 };
  }
});

// lib/cmd/config.js
var require_config = __commonJS({
  "lib/cmd/config.js"(exports2, module2) {
    var fs = require("fs");
    var { loadDotEnv: loadDotEnv2, saveApiKeyToFile: saveApiKeyToFile2, validateApiKey, getBaseUrl: getBaseUrl2, getTimeoutMs: getTimeoutMs2 } = require_api();
    var { resolveApiKey: resolveApiKey2, getEnvFilePath: getEnvFilePath2 } = require_env();
    var { makeError: makeError2, printError: printError2, EXIT_CODES: EXIT_CODES2 } = require_errors();
    function maskKey(key) {
      if (!key) return null;
      if (key.length <= 7) return key[0] + "****";
      return `${key.slice(0, 3)}****${key.slice(-4)}`;
    }
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
    function targetEnvFile(opts, ctx) {
      const options = opts || {};
      const context = ctx || {};
      return getEnvFilePath2({ envFile: options.envFile, skillDir: context.skillDir });
    }
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
    function detectSource(resolved, envFile) {
      if (!resolved.apiKey || resolved.source === "cli") return resolved.source;
      const fileKey = readEnvValueFromFile(envFile, "DEEPSEEK_API_KEY");
      return fileKey && fileKey === resolved.apiKey ? "envFile" : resolved.source;
    }
    function showConfig(opts, ctx) {
      const options = opts || {};
      const envFile = targetEnvFile(options, ctx);
      const resolved = resolveApiKey2({ envFile, skillDir: (ctx || {}).skillDir });
      const payload = {
        apiKey: maskKey(resolved.apiKey),
        source: detectSource(resolved, envFile),
        envFile,
        envFileExists: fs.existsSync(envFile),
        baseUrl: getBaseUrl2(),
        timeoutMs: getTimeoutMs2()
      };
      console.log(JSON.stringify(payload, null, 2));
      return EXIT_CODES2.OK;
    }
    async function setKey(positionals, opts, ctx) {
      const options = opts || {};
      const context = ctx || {};
      let key = positionals && positionals[1] ? String(positionals[1]).trim() : "";
      if (!key && typeof options.key === "string") key = options.key.trim();
      if (!key && typeof options.apiKey === "string") key = options.apiKey.trim();
      if (!key && options.stdin) key = await readStdin();
      if (!key) {
        printError2(
          makeError2(
            "\u53C2\u6570\u9519\u8BEF",
            "set-key \u9700\u8981\u63D0\u4F9B API Key\uFF1Anode skill.js config set-key sk-xxxx\n\u4E5F\u53EF\u4F7F\u7528 --key sk-xxxx\uFF08\u6216 -k / --api-key sk-xxxx\uFF09\uFF0C\u6216\u7528 --stdin \u4ECE\u6807\u51C6\u8F93\u5165\u8BFB\u53D6"
          )
        );
        return EXIT_CODES2.USAGE;
      }
      const check = validateApiKey(key);
      if (!check.ok) {
        printError2(makeError2("\u53C2\u6570\u9519\u8BEF", `API Key \u4E0D\u5408\u6CD5\uFF1A${check.message}`));
        return EXIT_CODES2.USAGE;
      }
      loadDotEnv2(context.skillDir);
      const envFile = targetEnvFile(options, context);
      const saved = saveApiKeyToFile2(envFile, key);
      console.log(
        JSON.stringify(
          {
            saved: true,
            path: saved.path,
            message: `\u5DF2\u5199\u5165 ${saved.path}\uFF08\u8BE5\u6587\u4EF6\u5DF2\u88AB .gitignore \u5FFD\u7565\uFF0C\u4E0D\u4F1A\u63D0\u4EA4\uFF09`
          },
          null,
          2
        )
      );
      return EXIT_CODES2.OK;
    }
    async function cmdConfig2(positionals, opts, ctx) {
      const sub = positionals && positionals[0] ? String(positionals[0]) : "show";
      if (sub === "show") return showConfig(opts, ctx);
      if (sub === "path") {
        console.log(targetEnvFile(opts, ctx));
        return EXIT_CODES2.OK;
      }
      if (sub === "set-key") return setKey(positionals, opts, ctx);
      printError2(
        makeError2("\u53C2\u6570\u9519\u8BEF", `config \u4E0D\u652F\u6301\u5B50\u547D\u4EE4\uFF1A${sub}\uFF08\u53EF\u7528\uFF1Ashow / path / set-key\uFF09`)
      );
      return EXIT_CODES2.USAGE;
    }
    module2.exports = { cmdConfig: cmdConfig2, maskKey, targetEnvFile, readEnvValueFromFile, detectSource };
  }
});

// lib/cmd/index.js
var require_cmd = __commonJS({
  "lib/cmd/index.js"(exports2, module2) {
    var { cmdSearch: cmdSearch2 } = require_search();
    var { cmdFetch: cmdFetch2 } = require_fetch();
    var { cmdConfig: cmdConfig2 } = require_config();
    module2.exports = { cmdSearch: cmdSearch2, cmdFetch: cmdFetch2, cmdConfig: cmdConfig2 };
  }
});

// run.js
var path = require("path");
var {
  SKILL_VERSION,
  BASE_URL,
  loadDotEnv,
  getBaseUrl,
  getTimeoutMs,
  saveApiKeyToFile,
  missingKeyError
} = require_api();
var { resolveApiKey, getEnvFilePath, askForApiKey } = require_env();
var { parseArgs, validateCommonOpts, toInt } = require_cli();
var { makeError, printError, EXIT_CODES } = require_errors();
var { cmdSearch, cmdFetch, cmdConfig } = require_cmd();
var { checkQueryLength, checkOriQuestion } = require_search();
var { validateUrl } = require_fetch();
var SKILL_DIR = __dirname;
loadDotEnv(SKILL_DIR);
function showHelp() {
  console.log(`
DeepSeek \u7F51\u9875\u641C\u7D22\u4E0E\u6293\u53D6\u5DE5\u5177 v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <command> [args] [options]

  \u6CE8\u610F\uFF1A\u67E5\u8BE2\u8BCD / URL \u5FC5\u987B\u7D27\u8DDF\u5728\u547D\u4EE4\u4E4B\u540E\uFF0C\u9009\u9879\u653E\u5728\u5176\u540E\u3002
    \u2713 node skill.js search "\u5173\u952E\u8BCD" --count 5
    \u2717 node skill.js --count 5 "\u5173\u952E\u8BCD"

\u547D\u4EE4:
  search <\u5173\u952E\u8BCD>              \u7F51\u9875\u641C\u7D22\uFF0C\u8FD4\u56DE\u6807\u9898 / \u94FE\u63A5 / \u6458\u8981 / \u76F8\u5173\u5206
  fetch <url>                  \u6293\u53D6\u5355\u4E2A\u7F51\u9875\uFF0C\u8FD4\u56DE Markdown \u6B63\u6587
  config [show|path|set-key]   \u67E5\u770B\u914D\u7F6E / \u8F93\u51FA .env \u8DEF\u5F84 / \u5199\u5165 API Key\uFF08\u65E0\u9700 Key\uFF09

\u9009\u9879:
  --api-key, -k <key>          \u5355\u6B21\u4F20\u5165 API Key\uFF08\u4E0D\u843D\u76D8\uFF09
  --env-file <path>            \u6307\u5B9A .env \u6587\u4EF6\u8DEF\u5F84\uFF08\u9ED8\u8BA4 <skillDir>/.env\uFF09
                               \u6CE8\u610F\uFF1ANode 20.6+ \u4E5F\u4F1A\u89E3\u6790 --env-file\uFF0C\u6587\u4EF6\u4E0D\u5B58\u5728\u65F6 Node \u76F4\u63A5\u4EE5 9 \u9000\u51FA
  --dotenv-file <path>         \u540C\u4E0A\uFF0C\u4F46\u4E0D\u4E0E Node \u5185\u7F6E\u9009\u9879\u51B2\u7A81\uFF08\u76EE\u6807\u6587\u4EF6\u5C1A\u672A\u521B\u5EFA\u65F6\u8BF7\u7528\u8FD9\u4E2A\uFF09
  --format, -f <fmt>           \u8F93\u51FA\u683C\u5F0F\uFF1Atable\uFF08\u9ED8\u8BA4\uFF09/ json / markdown
  --json                       \u7B49\u4EF7\u4E8E --format json
  --timeout, -t <ms>           \u8BF7\u6C42\u8D85\u65F6\uFF08\u9ED8\u8BA4 30000\uFF0C\u56DE\u9000 DEEPSEEK_TIMEOUT_MS\uFF09
  --no-input                   \u7981\u6B62\u4EA4\u4E92\u5F0F\u8BE2\u95EE\uFF08\u7B49\u540C\u4E8E DEEPSEEK_NO_PROMPT=1\uFF09
  --dry-run                    \u53EA\u6253\u5370\u5C06\u8981\u53D1\u9001\u7684\u8BF7\u6C42\uFF0C\u4E0D\u5B9E\u9645\u8C03\u7528\u63A5\u53E3
  --stdin                      \u4ECE\u6807\u51C6\u8F93\u5165\u8BFB\u53D6\u5173\u952E\u8BCD / Key
  --help, -h                   \u663E\u793A\u5E2E\u52A9
  --version, -v                \u663E\u793A\u7248\u672C

search \u4E13\u5C5E\u9009\u9879:
  --count, -n <1-50>           \u8FD4\u56DE\u6761\u6570\uFF08\u9ED8\u8BA4 10\uFF09
  --content                    \u9644\u5E26\u7F51\u9875\u6B63\u6587\uFF08need_content=true\uFF0C\u6B63\u6587\u6309 500 \u5B57\u7B26\u622A\u65AD\u663E\u793A\uFF09
  --ori-question <\u6587\u672C>        \u89E6\u53D1\u641C\u7D22\u7684\u7528\u6237\u539F\u59CB\u95EE\u9898\uFF081~128 \u5B57\u7B26\uFF09\uFF0C\u5E2E\u52A9\u7406\u89E3\u641C\u7D22\u610F\u56FE
  --localization <IP>          \u7528\u4E8E\u4F18\u5148\u8FD4\u56DE\u672C\u5730\u5316\u641C\u7D22\u7ED3\u679C\u7684 IP

fetch \u4E13\u5C5E\u9009\u9879:
  --raw                        \u53EA\u8F93\u51FA\u6B63\u6587\uFF0C\u4E0D\u52A0\u6807\u9898
  --out, -o <file>             \u5C06\u6B63\u6587\u5199\u5165\u6587\u4EF6\uFF08\u8F93\u51FA { saved, bytes }\uFF09

\u793A\u4F8B:
  node skill.js search "DeepSeek V4 \u53D1\u5E03" --count 5
  node skill.js search "DeepSeek site:github.com lang:zh after:2025" -n 5 --content
  node skill.js search "\u6A21\u578B\u5B9A\u4EF7" --format markdown
  echo "\u91CF\u5B50\u8BA1\u7B97" | node skill.js search --stdin --json
  node skill.js fetch "https://api-docs.deepseek.com/zh-cn/guides/search" --raw
  node skill.js fetch "https://example.com/article" --out article.md
  node skill.js config show
  node skill.js config set-key sk-xxxx
  node skill.js config --env-file ./my.env set-key sk-xxxx

\u73AF\u5883\u53D8\u91CF:
  DEEPSEEK_API_KEY        DeepSeek API Key\uFF08\u5FC5\u9700\uFF0C\u8BF7\u5728 .env \u6216\u73AF\u5883\u53D8\u91CF\u4E2D\u914D\u7F6E\uFF09
  DEEPSEEK_BASE_URL       \u63A5\u53E3\u5730\u5740\uFF08\u9ED8\u8BA4 ${BASE_URL}\uFF09
  DEEPSEEK_TIMEOUT_MS     \u8BF7\u6C42\u8D85\u65F6\u6BEB\u79D2\u6570\uFF08\u9ED8\u8BA4 30000\uFF09
  DEEPSEEK_NO_PROMPT      \u8BBE\u4E3A 1 \u65F6\u7981\u6B62\u4EA4\u4E92\u5F0F\u8BE2\u95EE Key\uFF08\u811A\u672C / CI \u573A\u666F\uFF09

\u8BA1\u8D39\u4E0E\u9650\u901F:
  - Search \u4E0E Fetch \u5404\u81EA\u72EC\u7ACB\u9650\u901F 5 QPS\uFF08\u6309\u8D26\u53F7\u8BA1\u7B97\uFF0C\u4E0E\u4F7F\u7528\u54EA\u4E2A Key \u65E0\u5173\uFF09\uFF0C\u8D85\u51FA\u8FD4\u56DE 429
  - \u6BCF 1000 \u6B21\u6210\u529F\u8BF7\u6C42 5 \u5143\uFF0C\u6309\u8BF7\u6C42\u6B21\u6570\u8BA1\u8D39\uFF0Ccount \u4E0D\u5F71\u54CD\u5355\u6B21\u4EF7\u683C
  - \u8BF7\u6C42\u5931\u8D25\u3001\u641C\u7D22\u65E0\u7ED3\u679C\uFF08results \u4E3A\u7A7A\uFF09\u3001\u8D85\u65F6\u5747\u4E0D\u8BA1\u8D39

\u9996\u6B21\u4F7F\u7528:
  \u672A\u68C0\u6D4B\u5230 API Key \u65F6\uFF0C\u4EA4\u4E92\u5F0F\u7EC8\u7AEF\u4F1A\u4E3B\u52A8\u8BE2\u95EE\uFF1B\u8F93\u5165\u540E\u4F1A\u4FDD\u5B58\u5230
  ${path.join(SKILL_DIR, ".env")}\uFF08\u8BE5\u6587\u4EF6\u5DF2\u88AB .gitignore \u5FFD\u7565\uFF0C\u4E0D\u4F1A\u63D0\u4EA4\uFF09
`);
}
function buildContext(opts) {
  const checked = validateCommonOpts(opts);
  if (checked.error) return checked;
  let timeoutMs = getTimeoutMs();
  if (opts.timeout !== void 0) {
    const parsed = toInt(opts.timeout, "--timeout", { min: 1 });
    if (typeof parsed !== "number") return parsed;
    timeoutMs = parsed;
  }
  return {
    ctx: {
      baseUrl: getBaseUrl(),
      timeoutMs,
      format: checked.format,
      json: Boolean(opts.json),
      count: checked.count,
      skillDir: SKILL_DIR,
      envFile: opts.envFile
    }
  };
}
function preflight(command, positionals, opts) {
  const options = opts || {};
  if (command === "search") {
    const query = (positionals || []).join(" ").trim();
    if (!query && !options.stdin) {
      return makeError(
        "\u53C2\u6570\u9519\u8BEF",
        'search \u547D\u4EE4\u9700\u8981\u5173\u952E\u8BCD\uFF1Anode skill.js search "\u5173\u952E\u8BCD"\uFF08\u6216\u4F7F\u7528 --stdin \u4ECE\u6807\u51C6\u8F93\u5165\u8BFB\u53D6\uFF09'
      );
    }
    if (query) {
      const bad = checkQueryLength(query);
      if (bad) return bad;
    }
    const oriQuestion = typeof options.oriQuestion === "string" && options.oriQuestion.trim() ? options.oriQuestion.trim() : null;
    return checkOriQuestion(oriQuestion);
  }
  if (command === "fetch") {
    const check = validateUrl((positionals || [])[0]);
    return check.ok ? null : makeError("\u53C2\u6570\u9519\u8BEF", check.message);
  }
  return null;
}
async function main() {
  const argv = process.argv.slice(2);
  const { command, positionals, opts } = parseArgs(argv);
  if (opts.help || argv.length === 0) {
    showHelp();
    return EXIT_CODES.OK;
  }
  if (opts.version) {
    console.log(`DeepSeek \u7F51\u9875\u641C\u7D22\u4E0E\u6293\u53D6\u5DE5\u5177 v${SKILL_VERSION}`);
    return EXIT_CODES.OK;
  }
  if (command === "config") {
    return cmdConfig(positionals, opts, { skillDir: SKILL_DIR, envFile: opts.envFile });
  }
  if (command !== "search" && command !== "fetch") {
    showHelp();
    printError(
      makeError("\u7528\u6CD5\u9519\u8BEF", `\u672A\u77E5\u547D\u4EE4\uFF1A${command}\uFF08\u53EF\u7528\u547D\u4EE4\uFF1Asearch / fetch / config\uFF09`)
    );
    return EXIT_CODES.USAGE;
  }
  const pre = preflight(command, positionals, opts);
  if (pre) {
    printError(pre);
    return EXIT_CODES.USAGE;
  }
  const resolved = resolveApiKey({ apiKey: opts.apiKey, envFile: opts.envFile, skillDir: SKILL_DIR });
  if (resolved.invalid) {
    printError(makeError("\u53C2\u6570\u9519\u8BEF", `--api-key \u4E0D\u5408\u6CD5\uFF1A${resolved.invalid}`));
    return EXIT_CODES.USAGE;
  }
  let apiKey = resolved.apiKey;
  if (!apiKey && !opts.dryRun) {
    if (opts.stdin) {
      printError(
        makeError(
          "API Key \u7F3A\u5931",
          "--stdin \u9700\u8981\u7528 stdin \u4F20\u9012\u67E5\u8BE2\u8BCD\uFF0C\u65E0\u6CD5\u540C\u65F6\u7528\u5B83\u8F93\u5165 API Key\u3002\n\n\u8BF7\u6539\u7528\u4EE5\u4E0B\u4EFB\u4E00\u65B9\u5F0F\u63D0\u4F9B Key \u540E\u91CD\u8BD5\uFF1A\n  (a) \u547D\u4EE4\u884C\u4F20\u5165\uFF1Anode skill.js search --stdin --api-key sk-xxxx\uFF08\u6216 -k sk-xxxx\uFF09\uFF1B\n  (b) \u5148\u5199\u5165\u672C\u5730\u914D\u7F6E\uFF1Anode skill.js config set-key sk-xxxx\uFF08\u9ED8\u8BA4\u5199 .env\uFF09\uFF1B\n  (c) \u6307\u5B9A\u914D\u7F6E\u6587\u4EF6\uFF1Anode skill.js search --stdin --env-file <path>\uFF1B\n  (d) \u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF DEEPSEEK_API_KEY\u3002"
        )
      );
      return EXIT_CODES.NO_KEY;
    }
    const asked = await askForApiKey({ noInput: Boolean(opts.noInput) });
    if (asked.status === "invalid") {
      printError(makeError("\u53C2\u6570\u9519\u8BEF", `API Key \u4E0D\u5408\u6CD5\uFF1A${asked.message}`));
      return EXIT_CODES.USAGE;
    }
    if (asked.status === "key") {
      const envFile = getEnvFilePath({ envFile: opts.envFile, skillDir: SKILL_DIR });
      const saved = saveApiKeyToFile(envFile, asked.apiKey);
      console.log(`\u2713 API Key \u5DF2\u4FDD\u5B58\u5230 ${saved.path}\uFF08\u5DF2\u52A0\u5165 .gitignore\uFF0C\u4E0D\u4F1A\u63D0\u4EA4\uFF09`);
      apiKey = asked.apiKey;
    } else {
      printError(missingKeyError());
      return EXIT_CODES.NO_KEY;
    }
  }
  const built = buildContext(opts);
  if (built.error) {
    printError({ error: built.error, message: built.message });
    return EXIT_CODES.USAGE;
  }
  const ctx = built.ctx;
  if (command === "search") return cmdSearch(positionals, opts, Object.assign({ apiKey }, ctx));
  return cmdFetch(positionals, opts, Object.assign({ apiKey }, ctx));
}
main().then((code) => {
  process.exitCode = typeof code === "number" ? code : EXIT_CODES.OK;
}).catch((e) => {
  printError(makeError("\u5185\u90E8\u9519\u8BEF", e && e.message ? e.message : String(e)));
  process.exitCode = EXIT_CODES.API;
});
