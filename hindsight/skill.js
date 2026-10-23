#!/usr/bin/env node
// Hindsight MCP 客户端 v261024.000401 - 包含所有依赖，无需安装

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/errors.js
var require_errors = __commonJS({
  "lib/errors.js"(exports2, module2) {
    var EXIT_CODES2 = {
      OK: 0,
      RUNTIME: 1,
      USAGE: 2
    };
    var SkillError = class extends Error {
      /**
       * @param {string} message 错误详情（中文）
       * @param {{title?:string,exitCode?:number,status?:number,hint?:string}} [options]
       */
      constructor(message, options) {
        super(message);
        const opts = options || {};
        this.name = "SkillError";
        this.title = opts.title || "\u6267\u884C\u5931\u8D25";
        this.exitCode = opts.exitCode === void 0 ? EXIT_CODES2.RUNTIME : opts.exitCode;
        if (opts.status !== void 0) this.status = opts.status;
        if (opts.hint) this.hint = opts.hint;
      }
    };
    function usageError2(message, hint) {
      return new SkillError(message, { title: "\u53C2\u6570\u9519\u8BEF", exitCode: EXIT_CODES2.USAGE, hint });
    }
    function configError(message, hint) {
      return new SkillError(message, { title: "\u914D\u7F6E\u9519\u8BEF", exitCode: EXIT_CODES2.USAGE, hint });
    }
    function runtimeError(message, options) {
      return new SkillError(message, Object.assign({}, options, { exitCode: EXIT_CODES2.RUNTIME }));
    }
    function toPayload(error, context) {
      const isSkill = error instanceof SkillError;
      const message = error instanceof Error ? error.message : String(error);
      const payload = {
        error: isSkill ? error.title : context || "\u6267\u884C\u5931\u8D25",
        message
      };
      if (isSkill && error.status !== void 0) payload.status = error.status;
      if (isSkill && error.hint) payload.hint = error.hint;
      return payload;
    }
    function printError(error, context) {
      console.error(JSON.stringify(toPayload(error, context), null, 2));
    }
    function handleError2(error, context) {
      printError(error, context);
      if (error instanceof SkillError && typeof error.exitCode === "number") return error.exitCode;
      return EXIT_CODES2.RUNTIME;
    }
    module2.exports = {
      EXIT_CODES: EXIT_CODES2,
      SkillError,
      usageError: usageError2,
      configError,
      runtimeError,
      toPayload,
      printError,
      handleError: handleError2
    };
  }
});

// lib/mcp.js
var require_mcp = __commonJS({
  "lib/mcp.js"(exports2, module2) {
    var { runtimeError } = require_errors();
    var SKILL_VERSION2 = true ? "261024.000401" : "0.0.1-dev";
    var PROTOCOL_VERSION = "2024-11-05";
    var MAX_ERROR_BODY = 500;
    function parseSseEvents(text) {
      const events = [];
      let dataLines = [];
      for (const rawLine of String(text).split(/\r?\n/)) {
        if (rawLine === "") {
          if (dataLines.length) {
            events.push(dataLines.join("\n"));
            dataLines = [];
          }
          continue;
        }
        if (rawLine.startsWith(":")) continue;
        const colon = rawLine.indexOf(":");
        const field = colon === -1 ? rawLine : rawLine.slice(0, colon);
        let value = colon === -1 ? "" : rawLine.slice(colon + 1);
        if (value.startsWith(" ")) value = value.slice(1);
        if (field === "data") dataLines.push(value);
      }
      if (dataLines.length) events.push(dataLines.join("\n"));
      return events;
    }
    function parseRpcMessages(text) {
      const trimmed = String(text || "").trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (_) {
      }
      const messages = [];
      for (const data of parseSseEvents(trimmed)) {
        try {
          messages.push(JSON.parse(data));
        } catch (_) {
        }
      }
      return messages;
    }
    function extractText(result) {
      if (!result || !Array.isArray(result.content)) return "";
      return result.content.filter((item) => item && item.type === "text" && typeof item.text === "string").map((item) => item.text).join("\n");
    }
    function normalizeToolResult(result) {
      if (result === null || result === void 0) return null;
      if (result.structuredContent !== void 0 && result.structuredContent !== null) {
        return result.structuredContent;
      }
      const content = Array.isArray(result.content) ? result.content : null;
      if (!content) return result;
      const texts = content.filter((item) => item && item.type === "text" && typeof item.text === "string").map((item) => item.text);
      if (texts.length === 1) {
        try {
          return JSON.parse(texts[0]);
        } catch (_) {
          return texts[0];
        }
      }
      if (texts.length > 1) return texts.join("\n");
      return content;
    }
    function brief(text) {
      const s = String(text || "").replace(/\s+/g, " ").trim();
      return s.length > MAX_ERROR_BODY ? `${s.slice(0, MAX_ERROR_BODY)}...` : s;
    }
    function extractToolError(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      if (typeof value.error === "string" && value.error.trim()) return value.error.trim();
      if (value.error && typeof value.error === "object" && typeof value.error.message === "string") {
        return value.error.message.trim();
      }
      return null;
    }
    var McpClient2 = class {
      /**
       * @param {{url:string,authorization:string,timeoutMs:number}} config
       */
      constructor(config) {
        this.url = config.url;
        this.authorization = config.authorization;
        this.timeoutMs = config.timeoutMs || 6e4;
        this.sessionId = null;
        this.nextId = 1;
        this.initPromise = null;
        this.serverInfo = null;
      }
      /**
       * 构造请求头
       * @returns {Object<string,string>}
       */
      headers() {
        const headers = {
          "content-type": "application/json",
          accept: "application/json, text/event-stream"
        };
        if (this.authorization) headers.authorization = this.authorization;
        if (this.sessionId) {
          headers["mcp-session-id"] = this.sessionId;
          headers["mcp-protocol-version"] = PROTOCOL_VERSION;
        }
        return headers;
      }
      /**
       * 带超时的 fetch
       * @param {string} method
       * @param {string} body
       * @returns {Promise<Response>}
       */
      async fetchWithTimeout(method, body) {
        try {
          return await fetch(this.url, {
            method,
            headers: this.headers(),
            body,
            signal: AbortSignal.timeout(this.timeoutMs)
          });
        } catch (e) {
          throw this.networkError(e);
        }
      }
      /**
       * 网络异常 -> 中文运行时错误
       * @param {Error} error
       * @returns {SkillError}
       */
      networkError(error) {
        const name = error && error.name;
        if (name === "TimeoutError" || name === "AbortError") {
          return runtimeError(
            `\u8BF7\u6C42\u8D85\u65F6\uFF08${this.timeoutMs}ms\uFF09\uFF1AMCP \u670D\u52A1\u672A\u5728\u9650\u5B9A\u65F6\u95F4\u5185\u54CD\u5E94`,
            { title: "MCP \u8C03\u7528\u5931\u8D25", hint: "\u53EF\u8C03\u5927\u73AF\u5883\u53D8\u91CF HINDSIGHT_TIMEOUT_MS \u540E\u91CD\u8BD5" }
          );
        }
        const message = error && error.message ? error.message : String(error);
        if (/ECONNREFUSED/i.test(message)) {
          return runtimeError(`\u8FDE\u63A5\u88AB\u62D2\u7EDD\uFF1A${message}`, {
            title: "MCP \u8C03\u7528\u5931\u8D25",
            hint: "\u786E\u8BA4 HINDSIGHT_MCP_URL \u7684\u534F\u8BAE\u3001\u4E3B\u673A\u4E0E\u7AEF\u53E3\u6B63\u786E\uFF0C\u4E14\u670D\u52A1\u5DF2\u542F\u52A8"
          });
        }
        if (/ENOTFOUND|getaddrinfo/i.test(message)) {
          return runtimeError(`\u57DF\u540D\u65E0\u6CD5\u89E3\u6790\uFF1A${message}`, {
            title: "MCP \u8C03\u7528\u5931\u8D25",
            hint: "\u786E\u8BA4 HINDSIGHT_MCP_URL \u62FC\u5199\u6B63\u786E\uFF0C\u6216\u68C0\u67E5\u7F51\u7EDC / \u4EE3\u7406 / DNS"
          });
        }
        if (/certificate|self-signed|self signed/i.test(message)) {
          return runtimeError(`TLS \u8BC1\u4E66\u6821\u9A8C\u5931\u8D25\uFF1A${message}`, {
            title: "MCP \u8C03\u7528\u5931\u8D25",
            hint: "\u8BF7\u4F7F\u7528\u670D\u52A1\u7AEF\u6B63\u5F0F\u8BC1\u4E66\uFF0C\u6216\u5728\u53D7\u4FE1\u73AF\u5883\u4E2D\u901A\u8FC7 NODE_EXTRA_CA_CERTS \u6307\u5B9A CA"
          });
        }
        return runtimeError(`\u65E0\u6CD5\u8FDE\u63A5 MCP \u670D\u52A1\uFF1A${message}`, { title: "MCP \u8C03\u7528\u5931\u8D25" });
      }
      /**
       * HTTP 非 2xx -> 中文运行时错误
       * @param {number} status
       * @param {string} text
       * @returns {SkillError}
       */
      httpError(status, text) {
        let message = brief(text);
        try {
          const body = JSON.parse(text);
          if (body && body.error && body.error.message) message = body.error.message;
          else if (body && body.message) message = body.message;
        } catch (_) {
        }
        const error = runtimeError(`MCP \u8BF7\u6C42\u5931\u8D25\uFF08HTTP ${status}\uFF09\uFF1A${message || "\u65E0\u54CD\u5E94\u5185\u5BB9"}`, {
          title: "MCP \u8C03\u7528\u5931\u8D25",
          status
        });
        if (status === 401 || status === 403) {
          error.hint = "\u8BA4\u8BC1\u5931\u8D25\uFF1A\u68C0\u67E5 HINDSIGHT_TOKEN \u662F\u5426\u6709\u6548\uFF0C\u4E14\u4E0E HINDSIGHT_MCP_URL \u4E2D\u7684 bank \u5339\u914D\uFF1B\u4E5F\u53EF\u7528 HINDSIGHT_AUTH_HEADER \u76F4\u63A5\u7ED9\u51FA\u5B8C\u6574\u7684 Authorization \u5934";
        } else if (status === 404) {
          error.hint = "\u7AEF\u70B9\u4E0D\u5B58\u5728\uFF1AHINDSIGHT_MCP_URL \u5FC5\u987B\u662F\u5B8C\u6574\u7684 MCP \u7AEF\u70B9 URL\uFF08\u901A\u5E38\u5F62\u5982 https://example.com/mcp/<bank>\uFF09";
        } else if (status === 400 && /session/i.test(message)) {
          error.hint = "\u4F1A\u8BDD\u65E0\u6548\uFF1A\u672C\u5DE5\u5177\u6BCF\u6B21\u8C03\u7528\u90FD\u4F1A\u91CD\u65B0 initialize \u5E76\u643A\u5E26 mcp-session-id\uFF1B\u82E5\u6301\u7EED\u5931\u8D25\u8BF7\u68C0\u67E5\u670D\u52A1\u7AEF\u4F1A\u8BDD\u914D\u7F6E";
        } else if (status === 429) {
          error.hint = "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF1A\u8BF7\u964D\u4F4E\u8C03\u7528\u9891\u7387\u540E\u91CD\u8BD5";
        } else if (status >= 500) {
          error.hint = "\u670D\u52A1\u7AEF\u9519\u8BEF\uFF1A\u53EF\u7A0D\u540E\u91CD\u8BD5\uFF1B\u82E5\u6301\u7EED\u5931\u8D25\u8BF7\u68C0\u67E5 MCP \u670D\u52A1\u65E5\u5FD7";
        }
        return error;
      }
      /**
       * POST 一个 JSON-RPC 消息
       * @param {Object} body
       * @returns {Promise<string>} 响应正文
       */
      async post(body) {
        const res = await this.fetchWithTimeout("POST", JSON.stringify(body));
        const text = await res.text().catch(() => "");
        if (!res.ok) throw this.httpError(res.status, text);
        const sessionId = res.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        return text;
      }
      /**
       * 发送 JSON-RPC 请求并返回 result
       * @param {string} method
       * @param {Object} params
       * @returns {Promise<*>}
       */
      async request(method, params) {
        const id = this.nextId;
        this.nextId += 1;
        const text = await this.post({
          jsonrpc: "2.0",
          id,
          method,
          params
        });
        if (!String(text).trim()) {
          throw runtimeError(`MCP \u670D\u52A1\u7AEF\u8FD4\u56DE\u7A7A\u54CD\u5E94\uFF08${method}\uFF09`, { title: "MCP \u8C03\u7528\u5931\u8D25" });
        }
        const messages = parseRpcMessages(text);
        const message = messages.find((item) => item && item.id === id) || messages.find((item) => item && (item.result !== void 0 || item.error));
        if (!message) {
          throw runtimeError(`\u65E0\u6CD5\u89E3\u6790 MCP \u54CD\u5E94\uFF08${method}\uFF09\uFF1A${brief(text)}`, {
            title: "MCP \u8C03\u7528\u5931\u8D25"
          });
        }
        if (message.error) {
          const code = message.error.code === void 0 ? "" : ` ${message.error.code}`;
          throw runtimeError(
            `MCP \u670D\u52A1\u7AEF\u8FD4\u56DE\u9519\u8BEF\uFF08${method}${code}\uFF09\uFF1A${message.error.message || "\u672A\u77E5\u9519\u8BEF"}`,
            { title: "MCP \u8C03\u7528\u5931\u8D25" }
          );
        }
        return message.result;
      }
      /**
       * 建立会话：initialize + notifications/initialized
       * @returns {Promise<Object|null>} initialize 的 result
       */
      async initialize() {
        const result = await this.request("initialize", {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: {
            name: "hindsight-skill",
            version: SKILL_VERSION2
          }
        });
        if (!this.sessionId) {
          throw runtimeError("MCP \u670D\u52A1\u7AEF\u672A\u8FD4\u56DE mcp-session-id\uFF0C\u65E0\u6CD5\u7EE7\u7EED\u8C03\u7528", {
            title: "MCP \u8C03\u7528\u5931\u8D25",
            hint: "\u786E\u8BA4 HINDSIGHT_MCP_URL \u6307\u5411\u7684\u662F Streamable HTTP MCP \u7AEF\u70B9"
          });
        }
        await this.post({ jsonrpc: "2.0", method: "notifications/initialized" });
        this.serverInfo = result && result.serverInfo || null;
        return result;
      }
      /**
       * 惰性初始化（并发调用共享同一个 Promise）
       * @returns {Promise<Object|null>}
       */
      ensureInitialized() {
        if (!this.initPromise) this.initPromise = this.initialize();
        return this.initPromise;
      }
      /**
       * 调用工具
       * @param {string} name
       * @param {Object} [args]
       * @returns {Promise<*>}
       */
      async callTool(name, args) {
        await this.ensureInitialized();
        const result = await this.request("tools/call", {
          name,
          arguments: args || {}
        });
        if (result && result.isError) {
          throw runtimeError(`\u5DE5\u5177 ${name} \u6267\u884C\u5931\u8D25\uFF1A${extractText(result) || "\u670D\u52A1\u7AEF\u672A\u63D0\u4F9B\u9519\u8BEF\u8BE6\u60C5"}`, {
            title: "\u5DE5\u5177\u6267\u884C\u5931\u8D25"
          });
        }
        const normalized = normalizeToolResult(result);
        const toolError = extractToolError(normalized);
        if (toolError) {
          throw runtimeError(`\u5DE5\u5177 ${name} \u6267\u884C\u5931\u8D25\uFF1A${toolError}`, {
            title: "\u5DE5\u5177\u6267\u884C\u5931\u8D25"
          });
        }
        return normalized;
      }
      /**
       * 列出工具
       * @returns {Promise<Object[]>}
       */
      async listTools() {
        await this.ensureInitialized();
        const result = await this.request("tools/list", {});
        return result && Array.isArray(result.tools) ? result.tools : [];
      }
      /**
       * 结束会话（忽略失败）
       * @returns {Promise<void>}
       */
      async close() {
        if (!this.sessionId) return;
        const sessionId = this.sessionId;
        this.sessionId = null;
        try {
          const timeout = Math.min(this.timeoutMs, 5e3);
          await fetch(this.url, {
            method: "DELETE",
            headers: {
              authorization: this.authorization,
              "mcp-session-id": sessionId,
              "mcp-protocol-version": PROTOCOL_VERSION
            },
            signal: AbortSignal.timeout(timeout)
          });
        } catch (_) {
        }
      }
    };
    module2.exports = {
      SKILL_VERSION: SKILL_VERSION2,
      PROTOCOL_VERSION,
      McpClient: McpClient2,
      parseSseEvents,
      parseRpcMessages,
      normalizeToolResult,
      extractText
    };
  }
});

// lib/parser.js
var require_parser = __commonJS({
  "lib/parser.js"(exports2, module2) {
    var { usageError: usageError2 } = require_errors();
    var SHORT_ALIASES = {
      h: "help",
      v: "version",
      q: "query",
      f: "format"
    };
    var BOOLEAN_OPTIONS = /* @__PURE__ */ new Set([
      "help",
      "version",
      "prefer-observations",
      "restore",
      "no-resolve-entities"
    ]);
    var OPTIONAL_BOOLEAN_OPTIONS = /* @__PURE__ */ new Set(["resolve-entities"]);
    var KNOWN_OPTIONS = /* @__PURE__ */ new Set([
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
      "args-file"
    ]);
    function normalizeName(raw) {
      return String(raw).replace(/-([a-z0-9])/gi, (_, ch) => ch.toUpperCase());
    }
    var KNOWN_NORMALIZED = new Set([...KNOWN_OPTIONS].map(normalizeName));
    function isBoolLiteral(value) {
      return /^(true|false|1|0|yes|no|y|n|on|off)$/i.test(String(value).trim());
    }
    function toBool(value, name) {
      if (typeof value === "boolean") return value;
      const s = String(value === void 0 || value === null ? "" : value).trim().toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(s)) return true;
      if (["false", "0", "no", "n", "off"].includes(s)) return false;
      throw usageError2(`${name} \u9700\u8981\u5E03\u5C14\u503C\uFF08true/false\u30011/0\u3001yes/no\uFF09\uFF0C\u5F53\u524D\uFF1A${value}`);
    }
    function toInt(value, name, range) {
      const limits = range || {};
      const n = Number(value);
      if (value === true || value === "" || value === void 0 || value === null || !Number.isInteger(n)) {
        throw usageError2(`${name} \u5FC5\u987B\u662F\u6574\u6570\uFF0C\u5F53\u524D\uFF1A${value}`);
      }
      if (limits.min !== void 0 && n < limits.min) {
        throw usageError2(`${name} \u4E0D\u80FD\u5C0F\u4E8E ${limits.min}\uFF0C\u5F53\u524D\uFF1A${n}`);
      }
      if (limits.max !== void 0 && n > limits.max) {
        throw usageError2(`${name} \u4E0D\u80FD\u5927\u4E8E ${limits.max}\uFF0C\u5F53\u524D\uFF1A${n}`);
      }
      return n;
    }
    function parseJsonOption(value, name) {
      if (typeof value !== "string") throw usageError2(`${name} \u9700\u8981 JSON \u5B57\u7B26\u4E32`);
      try {
        return JSON.parse(value);
      } catch (e) {
        throw usageError2(`${name} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e.message}`);
      }
    }
    function parseJsonObjectOption(value, name) {
      const parsed = parseJsonOption(value, name);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw usageError2(`${name} \u9700\u8981 JSON \u5BF9\u8C61\uFF0C\u4F8B\u5982 {"key":"value"}`);
      }
      return parsed;
    }
    function splitCsv(value, name) {
      if (typeof value !== "string") throw usageError2(`${name} \u9700\u8981\u9017\u53F7\u5206\u9694\u7684\u5B57\u7B26\u4E32`);
      const items = value.split(",").map((item) => item.trim()).filter(Boolean);
      if (items.length === 0) throw usageError2(`${name} \u4E0D\u80FD\u4E3A\u7A7A`);
      return items;
    }
    function oneOf(value, name, allowed) {
      const text = String(value).trim();
      if (!allowed.includes(text)) {
        throw usageError2(`${name} \u53D6\u503C\u975E\u6CD5\uFF1A${text}\uFF08\u53EF\u9009 ${allowed.join(" / ")}\uFF09`);
      }
      return text;
    }
    function parseArgs2(argv) {
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
            options[name] = inline === void 0 ? false : !toBool(inline, token);
            i += 1;
          } else if (inline !== void 0) {
            options[name] = BOOLEAN_OPTIONS.has(rawName) || OPTIONAL_BOOLEAN_OPTIONS.has(rawName) ? toBool(inline, token) : inline;
            i += 1;
          } else if (BOOLEAN_OPTIONS.has(rawName)) {
            options[name] = true;
            i += 1;
          } else if (OPTIONAL_BOOLEAN_OPTIONS.has(rawName)) {
            const next = args[i + 1];
            if (next !== void 0 && isBoolLiteral(next)) {
              options[name] = toBool(next, token);
              i += 2;
            } else {
              options[name] = true;
              i += 1;
            }
          } else {
            const next = args[i + 1];
            if (next === void 0 || String(next).startsWith("-") && String(next) !== "-") {
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
    module2.exports = {
      parseArgs: parseArgs2,
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
      KNOWN_OPTIONS
    };
  }
});

// lib/env.js
var require_env = __commonJS({
  "lib/env.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var { configError } = require_errors();
    var DEFAULT_TIMEOUT_MS = 6e4;
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
    function loadEnvFile(file) {
      if (!fs.existsSync(file)) return false;
      const values = parseEnvText(fs.readFileSync(file, "utf8"));
      for (const [key, value] of Object.entries(values)) {
        if (process.env[key] === void 0) process.env[key] = value;
      }
      return true;
    }
    function loadEnvFiles(options) {
      const opts = options || {};
      const cwd = opts.cwd || process.cwd();
      const skillDir = opts.skillDir || path.join(__dirname, "..");
      const candidates = [];
      if (opts.dotenvFile) {
        const file = path.resolve(String(opts.dotenvFile));
        if (!fs.existsSync(file)) {
          throw configError(
            `--dotenv-file \u6307\u5B9A\u7684\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${file}`,
            "\u8BF7\u786E\u8BA4\u8DEF\u5F84\u6B63\u786E\uFF1B\u4E0D\u6307\u5B9A\u8BE5\u9009\u9879\u65F6\u9ED8\u8BA4\u8BFB\u53D6\u5F53\u524D\u76EE\u5F55/.env \u4E0E skill \u76EE\u5F55/.env"
          );
        }
        candidates.push(file);
      } else {
        candidates.push(path.join(cwd, ".env"));
        candidates.push(path.join(skillDir, ".env"));
      }
      const loaded = [];
      const seen = /* @__PURE__ */ new Set();
      for (const file of candidates) {
        if (seen.has(file)) continue;
        seen.add(file);
        if (loadEnvFile(file)) loaded.push(file);
      }
      return loaded;
    }
    function parseTimeout(raw) {
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TIMEOUT_MS;
    }
    function resolveConfig2(cliOptions, paths) {
      const options = cliOptions || {};
      const locations = paths || {};
      const envFiles = loadEnvFiles({
        dotenvFile: options.dotenvFile,
        cwd: locations.cwd,
        skillDir: locations.skillDir
      });
      const rawUrl = String(options.url || process.env.HINDSIGHT_MCP_URL || "").trim();
      if (!rawUrl) {
        throw configError(
          "\u7F3A\u5C11 HINDSIGHT_MCP_URL\uFF1A\u9700\u8981\u5B8C\u6574\u7684 MCP \u7AEF\u70B9 URL\uFF08\u5DF2\u5305\u542B /mcp/<bank>\uFF09",
          "\u8BF7\u5728\u672C skill \u76EE\u5F55\u7684 .env \u4E2D\u914D\u7F6E\uFF08\u53C2\u8003 .env.example\uFF09\uFF0C\u6216\u8BBE\u7F6E\u540C\u540D\u73AF\u5883\u53D8\u91CF"
        );
      }
      let parsedUrl;
      try {
        parsedUrl = new URL(rawUrl);
      } catch (_) {
        throw configError(
          `HINDSIGHT_MCP_URL \u4E0D\u662F\u5408\u6CD5 URL\uFF1A${rawUrl}`,
          "\u5E94\u5F62\u5982 https://example.com/mcp/your-bank"
        );
      }
      if (!/^https?:$/.test(parsedUrl.protocol)) {
        throw configError(
          `HINDSIGHT_MCP_URL \u4EC5\u652F\u6301 http/https\uFF0C\u5F53\u524D\u534F\u8BAE\uFF1A${parsedUrl.protocol}`,
          "\u5E94\u5F62\u5982 https://example.com/mcp/your-bank"
        );
      }
      const authHeader = String(process.env.HINDSIGHT_AUTH_HEADER || "").trim();
      const token = String(options.token || process.env.HINDSIGHT_TOKEN || "").trim();
      const authorization = authHeader || (token ? `Bearer ${token}` : "");
      if (!authorization) {
        throw configError(
          "\u7F3A\u5C11 HINDSIGHT_TOKEN\uFF1A\u6CA1\u6709\u53EF\u7528\u7684\u8BA4\u8BC1\u4FE1\u606F",
          "\u8BF7\u914D\u7F6E HINDSIGHT_TOKEN\uFF08\u6216\u76F4\u63A5\u914D\u7F6E\u5B8C\u6574\u7684 HINDSIGHT_AUTH_HEADER\uFF09\uFF0C\u53C2\u8003 .env.example"
        );
      }
      return {
        url: rawUrl,
        authorization,
        timeoutMs: parseTimeout(process.env.HINDSIGHT_TIMEOUT_MS),
        envFiles
      };
    }
    module2.exports = {
      DEFAULT_TIMEOUT_MS,
      parseEnvText,
      loadEnvFile,
      loadEnvFiles,
      parseTimeout,
      resolveConfig: resolveConfig2
    };
  }
});

// lib/output.js
var require_output = __commonJS({
  "lib/output.js"(exports2, module2) {
    var PREFERRED_COLUMNS = [
      "id",
      "memory_id",
      "name",
      "type",
      "context",
      "text",
      "content",
      "tags",
      "occurred_start",
      "occurred_end",
      "created_at",
      "updated_at",
      "state",
      "score"
    ];
    var MAX_CELL = 60;
    function output2(data, format = "json") {
      if (data === null || data === void 0) {
        console.log("(\u7A7A)");
        return;
      }
      if (typeof data === "string") {
        console.log(data);
        return;
      }
      if (format === "table") {
        renderAsTable(data);
        return;
      }
      console.log(JSON.stringify(data, null, 2));
    }
    function renderAsTable(data) {
      if (Array.isArray(data)) {
        renderAnyArray(data);
        return;
      }
      if (typeof data !== "object") {
        console.log(String(data));
        return;
      }
      const arrayKey = Object.keys(data).find(
        (key) => Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === "object"
      );
      if (!arrayKey) {
        renderKeyValue(data);
        return;
      }
      const scalars = Object.entries(data).filter(([, value]) => value === null || typeof value !== "object");
      if (scalars.length) {
        console.log(scalars.map(([key, value]) => `${key}: ${value}`).join("  "));
        console.log("");
      }
      renderAnyArray(data[arrayKey]);
    }
    function renderAnyArray(items) {
      if (!Array.isArray(items) || items.length === 0) {
        console.log("(\u65E0\u7ED3\u679C)");
        return;
      }
      if (typeof items[0] !== "object" || items[0] === null) {
        for (const item of items) console.log(String(item));
        return;
      }
      renderTable(items);
    }
    function renderKeyValue(data) {
      const rows = [];
      flatten(data, "", rows);
      const width = Math.max(...rows.map(([key]) => displayWidth(key)));
      const sep = `${"-".repeat(width + 2)}+${"-".repeat(52)}`;
      console.log(sep);
      for (const [key, value] of rows) {
        const text = String(value).replace(/\s+/g, " ");
        console.log(` ${pad(key, width)} | ${text.length > 100 ? `${text.slice(0, 97)}...` : text}`);
      }
      console.log(sep);
    }
    function flatten(value, prefix, out) {
      if (value === null || typeof value !== "object") {
        out.push([prefix, value]);
        return;
      }
      if (Array.isArray(value)) {
        out.push([prefix, value.length ? value.map(stringifyCell).join(", ") : "[]"]);
        return;
      }
      const entries = Object.entries(value);
      if (entries.length === 0) {
        out.push([prefix, "{}"]);
        return;
      }
      for (const [key, child] of entries) {
        flatten(child, prefix ? `${prefix}.${key}` : key, out);
      }
    }
    function renderTable(items) {
      const columns = pickColumns(items);
      if (columns.length === 0) {
        console.log(JSON.stringify(items, null, 2));
        return;
      }
      const rows = items.map(
        (item) => columns.map((column) => {
          const value = item[column];
          if (value === null || value === void 0) return "";
          const text = stringifyCell(value).replace(/\s+/g, " ");
          return text.length > MAX_CELL ? `${text.slice(0, MAX_CELL - 3)}...` : text;
        })
      );
      const widths = columns.map(
        (column, index) => Math.max(displayWidth(column), ...rows.map((row) => displayWidth(row[index])))
      );
      const sep = widths.map((width) => "-".repeat(width + 2)).join("+");
      console.log(sep);
      console.log(columns.map((column, index) => ` ${pad(column, widths[index])} `).join("|"));
      console.log(sep);
      for (const row of rows) {
        console.log(row.map((cell, index) => ` ${pad(cell, widths[index])} `).join("|"));
      }
      console.log(sep);
    }
    function pickColumns(items) {
      const first = items[0] || {};
      const keys = Object.keys(first).filter((key) => isScalarLike(first[key]));
      const preferred = PREFERRED_COLUMNS.filter((key) => keys.includes(key));
      const rest = keys.filter((key) => !preferred.includes(key));
      return [...preferred, ...rest].slice(0, 6);
    }
    function isScalarLike(value) {
      return value === null || typeof value !== "object" || Array.isArray(value);
    }
    function stringifyCell(value) {
      if (value === null || value === void 0) return "";
      if (Array.isArray(value)) return value.map(stringifyCell).join(",");
      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch (_) {
          return String(value);
        }
      }
      return String(value);
    }
    function pad(text, width) {
      const diff = width - displayWidth(text);
      return diff > 0 ? text + " ".repeat(diff) : text;
    }
    function displayWidth(text) {
      let width = 0;
      for (const ch of String(text)) {
        width += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1;
      }
      return width;
    }
    module2.exports = output2;
    module2.exports.renderAsTable = renderAsTable;
    module2.exports.renderKeyValue = renderKeyValue;
    module2.exports.renderTable = renderTable;
  }
});

// lib/cmd/memory.js
var require_memory = __commonJS({
  "lib/cmd/memory.js"(exports2, module2) {
    var fs = require("fs");
    var { usageError: usageError2 } = require_errors();
    var {
      toInt,
      toBool,
      parseJsonOption,
      parseJsonObjectOption,
      splitCsv,
      oneOf
    } = require_parser();
    var MEMORY_TYPES = ["world", "experience", "observation"];
    var TAGS_MATCH_MODES = ["any", "all", "any_strict", "all_strict", "exact"];
    function requireText(positionals, command, label) {
      const text = (positionals || []).join(" ").trim();
      if (!text) {
        const prefix = /^[A-Za-z_]/.test(label) ? "\u53C2\u6570 " : "";
        throw usageError2(`${command} \u9700\u8981${prefix}${label}`, `\u7528\u6CD5\uFF1Anode skill.js ${command} <${label}> [\u9009\u9879]`);
      }
      return text;
    }
    function readContent(positionals, options) {
      const fromArgs = (positionals || []).join(" ").trim();
      if (options.contentFile !== void 0) {
        if (fromArgs) {
          throw usageError2("\u5185\u5BB9\u540C\u65F6\u6765\u81EA\u4F4D\u7F6E\u53C2\u6570\u4E0E --content-file\uFF0C\u8BF7\u4E8C\u9009\u4E00");
        }
        const file = String(options.contentFile);
        let text;
        try {
          text = file === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(file, "utf8");
        } catch (e) {
          throw usageError2(`\u65E0\u6CD5\u8BFB\u53D6 --content-file\uFF1A${e.message}`);
        }
        if (!String(text).trim()) throw usageError2("--content-file \u5185\u5BB9\u4E3A\u7A7A");
        return String(text).trim();
      }
      if (!fromArgs) {
        throw usageError2(
          "retain \u9700\u8981\u8BB0\u5FC6\u5185\u5BB9",
          "\u7528\u6CD5\uFF1Anode skill.js retain <\u5185\u5BB9> [\u9009\u9879]\uFF1B\u5185\u5BB9\u8F83\u957F\u65F6\u53EF\u7528 --content-file <\u8DEF\u5F84>\uFF08- \u8868\u793A\u6807\u51C6\u8F93\u5165\uFF09"
        );
      }
      return fromArgs;
    }
    function tagsMatch(value) {
      return oneOf(value, "--tags-match", TAGS_MATCH_MODES);
    }
    async function retainWith(positionals, options, ctx) {
      const args = {
        content: readContent(positionals, options),
        context: options.context === void 0 ? "general" : String(options.context)
      };
      if (options.timestamp !== void 0) args.timestamp = String(options.timestamp);
      if (options.tags !== void 0) args.tags = splitCsv(options.tags, "--tags");
      if (options.metadata !== void 0) {
        args.metadata = parseJsonObjectOption(options.metadata, "--metadata");
      }
      if (options.documentId !== void 0) args.document_id = String(options.documentId);
      if (options.strategy !== void 0) args.strategy = String(options.strategy);
      if (options.updateMode !== void 0) {
        args.update_mode = String(options.updateMode);
      }
      return ctx.client.callTool("retain", args);
    }
    async function cmdRetain(positionals, options, ctx) {
      return retainWith(positionals, options, ctx);
    }
    async function cmdRecall(positionals, options, ctx) {
      const query = requireText(positionals, "recall", "\u67E5\u8BE2\u8BCD");
      const args = {
        query,
        max_tokens: options.maxTokens === void 0 ? 4096 : toInt(options.maxTokens, "--max-tokens", { min: 1 }),
        budget: options.budget === void 0 ? "high" : String(options.budget)
      };
      if (options.types !== void 0) args.types = splitCsv(options.types, "--types");
      if (options.preferObservations) args.prefer_observations = true;
      if (options.tags !== void 0) args.tags = splitCsv(options.tags, "--tags");
      if (options.tagsMatch !== void 0) args.tags_match = tagsMatch(options.tagsMatch);
      if (options.tagGroups !== void 0) {
        const groups = parseJsonOption(options.tagGroups, "--tag-groups");
        if (!Array.isArray(groups)) throw usageError2("--tag-groups \u9700\u8981 JSON \u6570\u7EC4");
        args.tag_groups = groups;
      }
      if (options.queryTimestamp !== void 0) {
        args.query_timestamp = String(options.queryTimestamp);
      }
      if (options.minScores !== void 0) {
        args.min_scores = parseJsonObjectOption(options.minScores, "--min-scores");
      }
      if (options.temporalWindow !== void 0) {
        args.temporal_window = parseJsonObjectOption(options.temporalWindow, "--temporal-window");
      }
      return ctx.client.callTool("recall", args);
    }
    async function cmdListMemories(positionals, options, ctx) {
      const args = {
        // 服务端工具的查询字段名是 q（不是 query）
        limit: options.limit === void 0 ? 100 : toInt(options.limit, "--limit", { min: 0 }),
        offset: options.offset === void 0 ? 0 : toInt(options.offset, "--offset", { min: 0 })
      };
      if (options.type !== void 0) args.type = oneOf(options.type, "--type", MEMORY_TYPES);
      if (options.query !== void 0) args.q = String(options.query);
      if (options.tags !== void 0) args.tags = splitCsv(options.tags, "--tags");
      if (options.tagsMatch !== void 0) args.tags_match = tagsMatch(options.tagsMatch);
      return ctx.client.callTool("list_memories", args);
    }
    async function cmdGetMemory(positionals, options, ctx) {
      const memoryId = requireText(positionals, "get-memory", "memory_id");
      return ctx.client.callTool("get_memory", { memory_id: memoryId });
    }
    async function cmdUpdateMemory(positionals, options, ctx) {
      const memoryId = requireText(positionals, "update-memory", "memory_id");
      const args = { memory_id: memoryId };
      let changed = false;
      if (options.text !== void 0) {
        args.text = String(options.text);
        changed = true;
      }
      if (options.context !== void 0) {
        args.context = String(options.context);
        changed = true;
      }
      if (options.occurredStart !== void 0) {
        args.occurred_start = String(options.occurredStart);
        changed = true;
      }
      if (options.occurredEnd !== void 0) {
        args.occurred_end = String(options.occurredEnd);
        changed = true;
      }
      if (options.factType !== void 0) {
        args.fact_type = String(options.factType);
        changed = true;
      }
      if (options.entities !== void 0) {
        args.entities = splitCsv(options.entities, "--entities");
        changed = true;
      }
      if (options.resolveEntities !== void 0) {
        args.resolve_entities = toBool(options.resolveEntities, "--resolve-entities");
        changed = true;
      }
      if (!changed) {
        throw usageError2(
          "update-memory \u81F3\u5C11\u9700\u8981\u63D0\u4F9B\u4E00\u4E2A\u8981\u4FEE\u6539\u7684\u5B57\u6BB5",
          "\u53EF\u7528\uFF1A--text / --context / --occurred-start / --occurred-end / --fact-type / --entities / --resolve-entities / --no-resolve-entities"
        );
      }
      return ctx.client.callTool("update_memory", args);
    }
    async function cmdInvalidateMemory(positionals, options, ctx) {
      const memoryId = requireText(positionals, "invalidate-memory", "memory_id");
      const args = { memory_id: memoryId };
      if (options.reason !== void 0) args.reason = String(options.reason);
      if (options.restore) args.restore = true;
      return ctx.client.callTool("invalidate_memory", args);
    }
    module2.exports = {
      cmdRetain,
      cmdRecall,
      cmdListMemories,
      cmdGetMemory,
      cmdUpdateMemory,
      cmdInvalidateMemory
    };
  }
});

// lib/cmd/mental_model.js
var require_mental_model = __commonJS({
  "lib/cmd/mental_model.js"(exports2, module2) {
    var { toInt, splitCsv } = require_parser();
    async function cmdListMentalModels(positionals, options, ctx) {
      const args = {
        limit: options.limit === void 0 ? 100 : toInt(options.limit, "--limit", { min: 1, max: 1e3 }),
        offset: options.offset === void 0 ? 0 : toInt(options.offset, "--offset", { min: 0 })
      };
      if (options.tags !== void 0) args.tags = splitCsv(options.tags, "--tags");
      return ctx.client.callTool("list_mental_models", args);
    }
    module2.exports = { cmdListMentalModels };
  }
});

// lib/cmd/meta.js
var require_meta = __commonJS({
  "lib/cmd/meta.js"(exports2, module2) {
    var fs = require("fs");
    var { usageError: usageError2 } = require_errors();
    var { parseJsonObjectOption } = require_parser();
    function firstLine(description) {
      if (typeof description !== "string") return "";
      const line = description.split(/\r?\n/).map((part) => part.trim()).find(Boolean);
      return line || "";
    }
    async function cmdTools(positionals, options, ctx) {
      const tools = await ctx.client.listTools();
      return {
        count: tools.length,
        tools: tools.map((tool) => ({
          name: tool && tool.name ? tool.name : "",
          description: firstLine(tool && tool.description),
          required: tool && tool.inputSchema && Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : []
        }))
      };
    }
    function readToolArgs(options) {
      const hasInline = options.args !== void 0;
      const hasFile = options.argsFile !== void 0;
      if (hasInline && hasFile) {
        throw usageError2("--args \u4E0E --args-file \u53EA\u80FD\u4E8C\u9009\u4E00");
      }
      if (!hasInline && !hasFile) return {};
      if (hasInline) {
        return parseJsonObjectOption(options.args, "--args");
      }
      const file = String(options.argsFile);
      let text;
      try {
        text = file === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(file, "utf8");
      } catch (e) {
        throw usageError2(`\u65E0\u6CD5\u8BFB\u53D6 --args-file\uFF1A${e.message}`);
      }
      if (!String(text).trim()) throw usageError2("--args-file \u5185\u5BB9\u4E3A\u7A7A");
      return parseJsonObjectOption(String(text), "--args-file");
    }
    async function cmdCall(positionals, options, ctx) {
      const tool = (positionals[0] || "").trim();
      if (!tool) {
        throw usageError2(
          "call \u9700\u8981\u5DE5\u5177\u540D",
          "\u7528\u6CD5\uFF1Anode skill.js call <tool> --args '{...}'\uFF08\u53EF\u5148\u6267\u884C node skill.js tools \u67E5\u770B\u5DE5\u5177\u6E05\u5355\uFF09"
        );
      }
      if (positionals.length > 1) {
        throw usageError2(
          "call \u53EA\u63A5\u53D7\u4E00\u4E2A\u5DE5\u5177\u540D\uFF0C\u5DE5\u5177\u53C2\u6570\u8BF7\u7528 --args \u6216 --args-file \u4F20\u5165"
        );
      }
      return ctx.client.callTool(tool, readToolArgs(options));
    }
    module2.exports = { cmdTools, cmdCall };
  }
});

// lib/cmd/index.js
var require_cmd = __commonJS({
  "lib/cmd/index.js"(exports2, module2) {
    var memory = require_memory();
    var mentalModel = require_mental_model();
    var meta = require_meta();
    module2.exports = {
      ...memory,
      ...mentalModel,
      ...meta
    };
  }
});

// run.js
var { SKILL_VERSION, McpClient } = require_mcp();
var { parseArgs } = require_parser();
var { resolveConfig } = require_env();
var { EXIT_CODES, usageError, handleError } = require_errors();
var output = require_output();
var cmd = require_cmd();
var SKILL_DIR = __dirname;
var FORMATS = ["json", "table"];
var COMMANDS = {
  retain: { handler: cmd.cmdRetain },
  recall: { handler: cmd.cmdRecall },
  "list-memories": { handler: cmd.cmdListMemories },
  "get-memory": { handler: cmd.cmdGetMemory },
  "update-memory": { handler: cmd.cmdUpdateMemory },
  "invalidate-memory": { handler: cmd.cmdInvalidateMemory },
  "list-mental-models": { handler: cmd.cmdListMentalModels },
  tools: { handler: cmd.cmdTools },
  call: { handler: cmd.cmdCall }
};
function showHelp() {
  console.log(`
Hindsight MCP \u5BA2\u6237\u7AEF v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <command> [args] [options]

\u547D\u4EE4:
  retain <\u5185\u5BB9>                 \u5199\u5165\u4E00\u6761\u8BB0\u5FC6\uFF08\u5F02\u6B65\uFF09
  recall <\u67E5\u8BE2\u8BCD>               \u68C0\u7D22\u76F8\u5173\u8BB0\u5FC6
  list-memories                 \u5206\u9875\u5217\u51FA\u8BB0\u5FC6
  get-memory <memory_id>        \u67E5\u770B\u5355\u6761\u8BB0\u5FC6
  update-memory <memory_id>     \u4FEE\u6539\u5355\u6761\u8BB0\u5FC6\uFF08\u81F3\u5C11\u63D0\u4F9B\u4E00\u4E2A\u4FEE\u6539\u5B57\u6BB5\uFF09
  invalidate-memory <id>        \u8F6F\u4F5C\u5E9F\u5355\u6761\u8BB0\u5FC6\uFF1B--restore \u6062\u590D
  list-mental-models            \u5217\u51FA\u5FC3\u667A\u6A21\u578B
  tools                         \u5217\u51FA\u670D\u52A1\u7AEF\u5DE5\u5177\uFF08\u540D\u79F0\u3001\u9996\u884C\u63CF\u8FF0\u3001\u5FC5\u586B\u53C2\u6570\uFF09
  call <tool>                   \u901A\u7528\u8C03\u7528\uFF0C\u53C2\u6570\u7528 --args / --args-file \u4F20\u5165 JSON

\u5199\u5165\u7EA6\u5B9A:
  retain \u4E3A\u5F02\u6B65\u5199\u5165\uFF0C\u672C skill \u53EA\u63D0\u4F9B\u8BE5\u5199\u5165\u547D\u4EE4\uFF0C\u4E0D\u63D0\u4F9B\u540C\u6B65\u5199\u5165 sync-retain\u3002
  retain \u8FD4\u56DE accepted \u4EC5\u8868\u793A\u53D7\u7406\uFF0C\u843D\u5E93\u4E0E\u53EF\u68C0\u7D22\u5B58\u5728\u5EF6\u8FDF\u3002

retain \u9009\u9879:
  --context <\u6587\u672C>              \u8BB0\u5FC6\u4E0A\u4E0B\u6587\uFF08\u9ED8\u8BA4 general\uFF09
  --timestamp <\u65F6\u95F4>            \u8BB0\u5FC6\u53D1\u751F\u65F6\u95F4\uFF08ISO 8601\uFF09
  --tags <a,b>                  \u6807\u7B7E\uFF0C\u9017\u53F7\u5206\u9694
  --metadata <JSON>             \u5143\u6570\u636E\u5BF9\u8C61
  --document-id <id>            \u5173\u8054\u7684\u6587\u6863 ID
  --strategy <\u540D\u79F0>             \u5199\u5165\u7B56\u7565
  --update-mode <\u6A21\u5F0F>          \u66F4\u65B0\u6A21\u5F0F\uFF08\u4EC5 retain\uFF09
  --content-file <\u8DEF\u5F84>         \u4ECE\u6587\u4EF6\u8BFB\u53D6\u5185\u5BB9\uFF1B- \u8868\u793A\u6807\u51C6\u8F93\u5165

recall \u9009\u9879:
  --max-tokens <n>              \u8FD4\u56DE\u5185\u5BB9 token \u4E0A\u9650\uFF08\u9ED8\u8BA4 4096\uFF09
  --budget <\u7EA7\u522B>               \u68C0\u7D22\u9884\u7B97\uFF08\u9ED8\u8BA4 high\uFF09
  --types <a,b>                 \u8BB0\u5FC6\u7C7B\u578B\uFF1Aworld / experience / observation
  --prefer-observations         \u4F18\u5148\u8FD4\u56DE observation
  --tags <a,b>                  \u6807\u7B7E\u8FC7\u6EE4
  --tags-match <\u6A21\u5F0F>           any | all | any_strict | all_strict | exact\uFF08\u9ED8\u8BA4 any\uFF09
  --tag-groups <JSON>           \u6807\u7B7E\u7EC4\u8FC7\u6EE4
  --query-timestamp <\u65F6\u95F4>      \u67E5\u8BE2\u65F6\u95F4\u70B9\uFF08ISO 8601\uFF09
  --min-scores <JSON>           \u5404\u7EF4\u5EA6\u6700\u4F4E\u5206
  --temporal-window <JSON>      \u65F6\u95F4\u7A97\u53E3

list-memories \u9009\u9879:
  --type <\u7C7B\u578B>                 world | experience | observation
  -q, --query <\u5173\u952E\u5B57>          \u6309\u5173\u952E\u5B57\u8FC7\u6EE4
  --limit <n>                   \u6761\u6570\u4E0A\u9650\uFF08\u9ED8\u8BA4 100\uFF09
  --offset <n>                  \u504F\u79FB\u91CF\uFF08\u9ED8\u8BA4 0\uFF09
  --tags <a,b>                  \u6807\u7B7E\u8FC7\u6EE4
  --tags-match <\u6A21\u5F0F>           \u6807\u7B7E\u5339\u914D\u6A21\u5F0F

update-memory \u9009\u9879:
  --text <\u6587\u672C>                 \u65B0\u7684\u8BB0\u5FC6\u6587\u672C
  --context <\u6587\u672C>              \u65B0\u7684\u4E0A\u4E0B\u6587
  --occurred-start <\u65F6\u95F4>       \u53D1\u751F\u65F6\u95F4\u8D77\u70B9
  --occurred-end <\u65F6\u95F4>         \u53D1\u751F\u65F6\u95F4\u7EC8\u70B9
  --fact-type <\u7C7B\u578B>            \u4E8B\u5B9E\u7C7B\u578B
  --entities <a,b>              \u5B9E\u4F53\u5217\u8868
  --resolve-entities [\u5E03\u5C14]     \u662F\u5426\u89E3\u6790\u5B9E\u4F53\uFF08\u9ED8\u8BA4 true\uFF09
  --no-resolve-entities         \u7B49\u4EF7\u4E8E --resolve-entities false

invalidate-memory \u9009\u9879:
  --reason <\u6587\u672C>               \u4F5C\u5E9F\u539F\u56E0
  --restore                     \u6062\u590D\u5DF2\u4F5C\u5E9F\u7684\u8BB0\u5FC6

list-mental-models \u9009\u9879:
  --tags <a,b>                  \u6807\u7B7E\u8FC7\u6EE4
  --limit <n>                   \u6761\u6570\u4E0A\u9650\uFF08\u9ED8\u8BA4 100\uFF0C\u8303\u56F4 1~1000\uFF09
  --offset <n>                  \u504F\u79FB\u91CF\uFF08\u9ED8\u8BA4 0\uFF09

call \u9009\u9879:
  --args <JSON>                 \u5DE5\u5177\u53C2\u6570\uFF08JSON \u5BF9\u8C61\uFF09
  --args-file <\u8DEF\u5F84>            \u4ECE\u6587\u4EF6\u8BFB\u53D6\u53C2\u6570\uFF1B- \u8868\u793A\u6807\u51C6\u8F93\u5165

\u901A\u7528\u9009\u9879:
  --url <\u5730\u5740>                  \u8986\u76D6 HINDSIGHT_MCP_URL
  --token <\u4EE4\u724C>                \u8986\u76D6 HINDSIGHT_TOKEN
  --format <json|table>         \u8F93\u51FA\u683C\u5F0F\uFF08\u9ED8\u8BA4 json\uFF09
  --dotenv-file <\u8DEF\u5F84>          \u6307\u5B9A .env \u6587\u4EF6\uFF08\u9ED8\u8BA4\u4F9D\u6B21\u67E5\u5F53\u524D\u76EE\u5F55\u3001skill \u76EE\u5F55\uFF09
  -h, --help                    \u663E\u793A\u5E2E\u52A9
  -v, --version                 \u663E\u793A\u7248\u672C

\u73AF\u5883\u53D8\u91CF:
  HINDSIGHT_MCP_URL             \u5B8C\u6574 MCP \u7AEF\u70B9 URL\uFF08\u542B /mcp/<bank>\uFF0C\u5FC5\u9700\uFF09
  HINDSIGHT_TOKEN               \u8BBF\u95EE\u4EE4\u724C\uFF08\u5FC5\u9700\uFF0C\u81EA\u52A8\u62FC\u6210 Bearer\uFF09
  HINDSIGHT_AUTH_HEADER         \u5B8C\u6574 Authorization \u5934\u503C\uFF08\u8BBE\u7F6E\u540E\u4F18\u5148\u4E8E token\uFF09
  HINDSIGHT_TIMEOUT_MS          \u8BF7\u6C42\u8D85\u65F6\u6BEB\u79D2\u6570\uFF08\u9ED8\u8BA4 60000\uFF09
  \u4EE5\u4E0A\u53D8\u91CF\u53EF\u5199\u5165\u672C skill \u76EE\u5F55\u7684 .env\uFF08\u53C2\u8003 .env.example\uFF0C\u5DF2\u88AB .gitignore \u5FFD\u7565\uFF09\u3002

\u793A\u4F8B:
  node skill.js retain "\u7528\u6237\u504F\u597D\uFF1A\u56DE\u7B54\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587" --tags preference,language
  node skill.js recall "\u7528\u6237\u8BED\u8A00\u504F\u597D" --max-tokens 2048
  node skill.js list-memories --type world --limit 20 --format table
  node skill.js get-memory <memory_id>
  node skill.js update-memory <memory_id> --text "\u4FEE\u6B63\u540E\u7684\u5185\u5BB9"
  node skill.js invalidate-memory <memory_id> --reason "\u5185\u5BB9\u5DF2\u8FC7\u65F6"
  node skill.js invalidate-memory <memory_id> --restore
  node skill.js list-mental-models --limit 10
  node skill.js tools
  node skill.js call recall --args '{"query":"\u90E8\u7F72\u62D3\u6251"}'

\u8F93\u51FA\u4E0E\u9000\u51FA\u7801:
  \u6210\u529F\u7ED3\u679C\u8F93\u51FA\u5230 stdout\uFF08JSON \u6216\u8868\u683C\uFF09\uFF0C\u9519\u8BEF\u4EE5 JSON \u8F93\u51FA\u5230 stderr\u3002
  0 \u6210\u529F | 1 \u8FD0\u884C\u65F6\u9519\u8BEF | 2 \u7528\u6CD5\u6216\u914D\u7F6E\u9519\u8BEF
`);
}
function showVersion() {
  console.log(`Hindsight MCP \u5BA2\u6237\u7AEF v${SKILL_VERSION}`);
}
async function main() {
  const argv = process.argv.slice(2);
  const { command: rawCommand, positionals, options, unknown } = parseArgs(argv);
  if (options.help || argv.length === 0) {
    showHelp();
    return EXIT_CODES.OK;
  }
  if (options.version) {
    showVersion();
    return EXIT_CODES.OK;
  }
  if (unknown.length) {
    throw usageError(
      `\u672A\u77E5\u9009\u9879\uFF1A${unknown.join(", ")}`,
      "\u53EF\u7528 --help \u67E5\u770B\u652F\u6301\u7684\u9009\u9879\uFF1B\u9009\u9879\u540D\u4F7F\u7528\u8FDE\u5B57\u7B26\u5199\u6CD5\uFF0C\u5982 --max-tokens"
    );
  }
  if (!rawCommand) {
    showHelp();
    return EXIT_CODES.OK;
  }
  const commandName = String(rawCommand).toLowerCase().replace(/_/g, "-");
  const command = COMMANDS[commandName];
  if (!command) {
    throw usageError(
      `\u672A\u77E5\u547D\u4EE4\uFF1A${rawCommand}`,
      `\u53EF\u7528\u547D\u4EE4\uFF1A${Object.keys(COMMANDS).join(" / ")}\uFF08\u6267\u884C --help \u67E5\u770B\u8BE6\u7EC6\u7528\u6CD5\uFF09`
    );
  }
  const format = String(options.format === void 0 ? "json" : options.format).toLowerCase();
  if (!FORMATS.includes(format)) {
    throw usageError(`--format \u53D6\u503C\u975E\u6CD5\uFF1A${options.format}\uFF08\u53EF\u9009 ${FORMATS.join(" / ")}\uFF09`);
  }
  const config = resolveConfig(options, { skillDir: SKILL_DIR });
  const client = new McpClient(config);
  try {
    const result = await command.handler(positionals, options, {
      client,
      config,
      format,
      skillDir: SKILL_DIR
    });
    output(result, format);
    return EXIT_CODES.OK;
  } finally {
    await client.close();
  }
}
main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  process.exitCode = handleError(error);
});
