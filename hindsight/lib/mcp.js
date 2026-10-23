/**
 * Hindsight MCP 客户端（Streamable HTTP，JSON-RPC 2.0）
 *
 * 一次 CLI 调用的完整流程：
 *   1. POST initialize，保存响应头中的 mcp-session-id
 *   2. POST notifications/initialized
 *   3. POST tools/call 或 tools/list
 *   4. DELETE 结束会话（失败可忽略）
 *
 * 服务端响应可能是 application/json，也可能是 text/event-stream（SSE）；
 * 两种都兼容。工具结果优先返回 structuredContent，其次解析 content[].text 的 JSON。
 */

const { runtimeError } = require("./errors");

// 版本号（打包时由 build.js 通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "0.0.1-dev";

const PROTOCOL_VERSION = "2024-11-05";
const MAX_ERROR_BODY = 500;

/**
 * 解析 SSE 正文，返回每个事件的 data 文本
 * 规则：空行分隔事件；多行 data: 用换行拼接；忽略 event:/id:/注释行。
 * @param {string} text
 * @returns {string[]}
 */
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

/**
 * 把响应正文解析成 JSON-RPC 消息数组
 * @param {string} text
 * @returns {Object[]}
 */
function parseRpcMessages(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (_) {
    // 非纯 JSON：按 SSE 解析
  }

  const messages = [];
  for (const data of parseSseEvents(trimmed)) {
    try {
      messages.push(JSON.parse(data));
    } catch (_) {
      // 忽略非 JSON 事件（如心跳）
    }
  }
  return messages;
}

/**
 * 从工具结果中提取文本内容
 * @param {Object} result
 * @returns {string}
 */
function extractText(result) {
  if (!result || !Array.isArray(result.content)) return "";
  return result.content
    .filter((item) => item && item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n");
}

/**
 * 归一化工具结果：
 *   structuredContent > 单个 text 的 JSON > 多段 text 拼接 > 原始 result
 * @param {Object} result
 * @returns {*}
 */
function normalizeToolResult(result) {
  if (result === null || result === undefined) return null;
  if (result.structuredContent !== undefined && result.structuredContent !== null) {
    return result.structuredContent;
  }

  const content = Array.isArray(result.content) ? result.content : null;
  if (!content) return result;

  const texts = content
    .filter((item) => item && item.type === "text" && typeof item.text === "string")
    .map((item) => item.text);

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

/**
 * 截断错误正文，避免把大段响应直接抛给用户
 * @param {string} text
 * @returns {string}
 */
function brief(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > MAX_ERROR_BODY ? `${s.slice(0, MAX_ERROR_BODY)}...` : s;
}

/**
 * 识别服务端以“正常结果”形式返回的业务错误。
 * Hindsight 对非法参数返回 isError:false，但 structuredContent/content 中带 error 字段。
 * @param {*} value
 * @returns {string|null}
 */
function extractToolError(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.error === "string" && value.error.trim()) return value.error.trim();
  if (value.error && typeof value.error === "object" && typeof value.error.message === "string") {
    return value.error.message.trim();
  }
  return null;
}

class McpClient {
  /**
   * @param {{url:string,authorization:string,timeoutMs:number}} config
   */
  constructor(config) {
    this.url = config.url;
    this.authorization = config.authorization;
    this.timeoutMs = config.timeoutMs || 60000;
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
      accept: "application/json, text/event-stream",
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
        signal: AbortSignal.timeout(this.timeoutMs),
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
        `请求超时（${this.timeoutMs}ms）：MCP 服务未在限定时间内响应`,
        { title: "MCP 调用失败", hint: "可调大环境变量 HINDSIGHT_TIMEOUT_MS 后重试" }
      );
    }
    const message = error && error.message ? error.message : String(error);
    if (/ECONNREFUSED/i.test(message)) {
      return runtimeError(`连接被拒绝：${message}`, {
        title: "MCP 调用失败",
        hint: "确认 HINDSIGHT_MCP_URL 的协议、主机与端口正确，且服务已启动",
      });
    }
    if (/ENOTFOUND|getaddrinfo/i.test(message)) {
      return runtimeError(`域名无法解析：${message}`, {
        title: "MCP 调用失败",
        hint: "确认 HINDSIGHT_MCP_URL 拼写正确，或检查网络 / 代理 / DNS",
      });
    }
    if (/certificate|self-signed|self signed/i.test(message)) {
      return runtimeError(`TLS 证书校验失败：${message}`, {
        title: "MCP 调用失败",
        hint: "请使用服务端正式证书，或在受信环境中通过 NODE_EXTRA_CA_CERTS 指定 CA",
      });
    }
    return runtimeError(`无法连接 MCP 服务：${message}`, { title: "MCP 调用失败" });
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
      // 非 JSON 响应，沿用原始文本
    }

    const error = runtimeError(`MCP 请求失败（HTTP ${status}）：${message || "无响应内容"}`, {
      title: "MCP 调用失败",
      status,
    });

    if (status === 401 || status === 403) {
      error.hint =
        "认证失败：检查 HINDSIGHT_TOKEN 是否有效，且与 HINDSIGHT_MCP_URL 中的 bank 匹配；" +
        "也可用 HINDSIGHT_AUTH_HEADER 直接给出完整的 Authorization 头";
    } else if (status === 404) {
      error.hint =
        "端点不存在：HINDSIGHT_MCP_URL 必须是完整的 MCP 端点 URL（通常形如 https://example.com/mcp/<bank>）";
    } else if (status === 400 && /session/i.test(message)) {
      error.hint =
        "会话无效：本工具每次调用都会重新 initialize 并携带 mcp-session-id；若持续失败请检查服务端会话配置";
    } else if (status === 429) {
      error.hint = "请求过于频繁：请降低调用频率后重试";
    } else if (status >= 500) {
      error.hint = "服务端错误：可稍后重试；若持续失败请检查 MCP 服务日志";
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
      params,
    });

    if (!String(text).trim()) {
      throw runtimeError(`MCP 服务端返回空响应（${method}）`, { title: "MCP 调用失败" });
    }

    const messages = parseRpcMessages(text);
    const message =
      messages.find((item) => item && item.id === id) ||
      messages.find((item) => item && (item.result !== undefined || item.error));

    if (!message) {
      throw runtimeError(`无法解析 MCP 响应（${method}）：${brief(text)}`, {
        title: "MCP 调用失败",
      });
    }

    if (message.error) {
      const code = message.error.code === undefined ? "" : ` ${message.error.code}`;
      throw runtimeError(
        `MCP 服务端返回错误（${method}${code}）：${message.error.message || "未知错误"}`,
        { title: "MCP 调用失败" }
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
        version: SKILL_VERSION,
      },
    });

    if (!this.sessionId) {
      throw runtimeError("MCP 服务端未返回 mcp-session-id，无法继续调用", {
        title: "MCP 调用失败",
        hint: "确认 HINDSIGHT_MCP_URL 指向的是 Streamable HTTP MCP 端点",
      });
    }

    // 通知无 id、无 params；服务端通常返回 202 且无正文
    await this.post({ jsonrpc: "2.0", method: "notifications/initialized" });

    this.serverInfo = (result && result.serverInfo) || null;
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
      arguments: args || {},
    });

    if (result && result.isError) {
      throw runtimeError(`工具 ${name} 执行失败：${extractText(result) || "服务端未提供错误详情"}`, {
        title: "工具执行失败",
      });
    }

    const normalized = normalizeToolResult(result);
    const toolError = extractToolError(normalized);
    if (toolError) {
      throw runtimeError(`工具 ${name} 执行失败：${toolError}`, {
        title: "工具执行失败",
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
      const timeout = Math.min(this.timeoutMs, 5000);
      await fetch(this.url, {
        method: "DELETE",
        headers: {
          authorization: this.authorization,
          "mcp-session-id": sessionId,
          "mcp-protocol-version": PROTOCOL_VERSION,
        },
        signal: AbortSignal.timeout(timeout),
      });
    } catch (_) {
      // 关闭失败不影响主流程
    }
  }
}

module.exports = {
  SKILL_VERSION,
  PROTOCOL_VERSION,
  McpClient,
  parseSseEvents,
  parseRpcMessages,
  normalizeToolResult,
  extractText,
};
