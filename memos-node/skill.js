#!/usr/bin/env node
// Memos API 客户端 v261012.181624 - 包含所有依赖，无需安装

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/api.js
var require_api = __commonJS({
  "lib/api.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var SKILL_VERSION2 = true ? "261012.181624" : "0.0.1-dev";
    var DEFAULT_URL = "http://localhost:5230";
    var DEFAULT_TIMEOUT = 3e4;
    function loadDotEnv() {
      const candidates = [
        path.join(__dirname, ".env"),
        path.join(__dirname, "..", ".env")
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
    function getConfig(options = {}) {
      loadDotEnv();
      const insecure = !!(options.insecure || process.env.MEMOS_INSECURE === "true");
      if (insecure) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }
      const baseUrl = String(options.url || process.env.MEMOS_URL || DEFAULT_URL).replace(/\/+$/, "");
      const token = String(options.token || process.env.MEMOS_TOKEN || process.env.MEMOS_API_TOKEN || "");
      return {
        baseUrl,
        token,
        timeout: parseInt(options.timeout || process.env.MEMOS_TIMEOUT || String(DEFAULT_TIMEOUT), 10),
        insecure
      };
    }
    function buildQuery(query) {
      if (!query) return "";
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === void 0 || value === null || value === "") continue;
        params.append(key, String(value));
      }
      const str = params.toString();
      return str ? `?${str}` : "";
    }
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
      }
      return { message: message || `HTTP ${status}`, code };
    }
    async function apiRequest(method, urlPath, opts = {}) {
      const config = opts.config || getConfig();
      const url = `${config.baseUrl}${urlPath}${buildQuery(opts.query)}`;
      const headers = { Accept: "application/json" };
      if (config.token) headers.Authorization = `Bearer ${config.token}`;
      let payload;
      if (opts.body !== void 0) {
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
          throw new Error(`\u8BF7\u6C42\u8D85\u65F6\uFF08${config.timeout}ms\uFF09\uFF1A${method} ${url}`);
        }
        throw new Error(`\u8BF7\u6C42\u5931\u8D25\uFF1A${e.message}`);
      } finally {
        clearTimeout(timer);
      }
      const accept = opts.accept || "json";
      if (!res.ok) {
        const text2 = await res.text().catch(() => "");
        const { message, code } = parseError(res.status, text2);
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
    function normalizeMemoUid(input) {
      if (!input) return "";
      let value = String(input).trim();
      if (/^https?:\/\//i.test(value)) {
        try {
          const segments = new URL(value).pathname.split("/").filter(Boolean);
          value = segments[segments.length - 1] || "";
        } catch (_) {
        }
      }
      if (value.startsWith("memos/")) value = value.slice("memos/".length);
      return value;
    }
    module2.exports = {
      SKILL_VERSION: SKILL_VERSION2,
      DEFAULT_URL,
      getConfig,
      buildQuery,
      apiRequest,
      normalizeMemoUid
    };
  }
});

// lib/parser.js
var require_parser = __commonJS({
  "lib/parser.js"(exports2, module2) {
    function parseArgs2(args) {
      const options = {};
      const positional = [];
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--") {
          positional.push(...args.slice(i + 1));
          break;
        }
        if (arg.startsWith("--")) {
          const key = arg.slice(2).toLowerCase();
          const next = args[i + 1];
          if (next !== void 0 && !next.startsWith("--")) {
            options[key] = next;
            i++;
          } else {
            options[key] = true;
          }
        } else if (arg.startsWith("-") && arg.length > 1) {
          options[arg.slice(1).toLowerCase()] = true;
        } else {
          positional.push(arg);
        }
      }
      return { positional, options };
    }
    module2.exports = { parseArgs: parseArgs2 };
  }
});

// lib/errors.js
var require_errors = __commonJS({
  "lib/errors.js"(exports2, module2) {
    function handleError2(error, context = "", code = 1) {
      const message = error instanceof Error ? error.message : String(error);
      const payload = { error: context || "\u64CD\u4F5C\u5931\u8D25", message };
      if (error && error.status) payload.status = error.status;
      if (error && error.grpcCode !== void 0 && error.grpcCode !== null) {
        payload.grpcCode = error.grpcCode;
      }
      const hint = buildHint(error, message);
      if (hint) payload.hint = hint;
      console.error(JSON.stringify(payload));
      process.exit(code);
    }
    function buildHint(error, message) {
      const status = error && error.status;
      if (status === 401) {
        return "\u672A\u8BA4\u8BC1\uFF1A\u68C0\u67E5 MEMOS_TOKEN \u662F\u5426\u4E3A\u6709\u6548\u7684\u4E2A\u4EBA\u8BBF\u95EE\u4EE4\u724C\uFF08\u5728 Memos \u7F51\u9875\u7AEF\u300C\u8BBE\u7F6E \u2192 \u8BBF\u95EE\u4EE4\u724C\u300D\u521B\u5EFA\uFF09\uFF0C\u4E14\u672A\u8FC7\u671F";
      }
      if (status === 403) {
        return "\u6743\u9650\u4E0D\u8DB3\uFF1A\u8BE5\u64CD\u4F5C\u53EA\u80FD\u7531 memo \u4F5C\u8005\u6267\u884C\uFF1B\u8BF7\u786E\u8BA4 token \u5BF9\u5E94\u7684\u8D26\u53F7\u4E0E memo \u7684 creator \u4E00\u81F4";
      }
      if (status === 404) {
        return "\u8D44\u6E90\u4E0D\u5B58\u5728\uFF1A\u786E\u8BA4 memo uid \u6B63\u786E\uFF08\u53EF\u7528 `memo list` \u67E5\u770B\uFF09\uFF0C\u6216\u8BE5 memo \u5DF2\u88AB\u5220\u9664/\u4E0D\u5C5E\u4E8E\u5F53\u524D\u8D26\u53F7";
      }
      if (status === 400 && /filter/i.test(message)) {
        return '\u8FC7\u6EE4\u8868\u8FBE\u5F0F\u975E\u6CD5\uFF1A\u5B57\u6BB5\u540D\u987B\u4E3A content / creator / created_ts / updated_ts / pinned / visibility / tags / has_link \u7B49\uFF1B\u65F6\u95F4\u8FC7\u6EE4\u5199\u6210 created_ts > now - duration("168h")';
      }
      if (status === 400) {
        return "\u8BF7\u6C42\u53C2\u6570\u975E\u6CD5\uFF1A\u68C0\u67E5 visibility\uFF08PRIVATE|PROTECTED|PUBLIC\uFF09\u3001updateMask \u5B57\u6BB5\u540D\u3001state\uFF08NORMAL|ARCHIVED\uFF09\u62FC\u5199";
      }
      if (status === 501) {
        return "\u8BE5\u63A5\u53E3\u5728\u5F53\u524D Memos \u7248\u672C\u672A\u5B9E\u73B0\uFF1A\u8001\u7248\u672C\u53EF\u80FD\u7F3A\u5C11\u6B64\u529F\u80FD\uFF0C\u8BF7\u786E\u8BA4\u5B9E\u4F8B\u7248\u672C\uFF08instance profile \u53EF\u67E5\uFF09";
      }
      if (/ECONNREFUSED/i.test(message)) {
        return "\u8FDE\u63A5\u88AB\u62D2\u7EDD\uFF1A\u786E\u8BA4 MEMOS_URL \u5730\u5740\u4E0E\u7AEF\u53E3\u6B63\u786E\uFF0C\u4E14 Memos \u670D\u52A1\u5DF2\u542F\u52A8";
      }
      if (/ENOTFOUND|getaddrinfo/i.test(message)) {
        return "\u57DF\u540D\u65E0\u6CD5\u89E3\u6790\uFF1A\u786E\u8BA4 MEMOS_URL \u62FC\u5199\u6B63\u786E\uFF0C\u6216\u7F51\u7EDC/DNS \u53EF\u7528";
      }
      if (/certificate|self-signed|self signed/i.test(message)) {
        return "\u8BC1\u4E66\u6821\u9A8C\u5931\u8D25\uFF1A\u81EA\u7B7E\u540D\u8BC1\u4E66\u53EF\u52A0 --insecure\uFF08\u6216\u8BBE MEMOS_INSECURE=true\uFF09\u8DF3\u8FC7\u6821\u9A8C\uFF0C\u4EC5\u5EFA\u8BAE\u5185\u7F51\u4F7F\u7528";
      }
      if (/请求超时/.test(message)) {
        return "\u8BF7\u6C42\u8D85\u65F6\uFF1A\u53EF\u52A0\u5927 --timeout\uFF08\u6BEB\u79D2\uFF09\uFF0C\u6216\u68C0\u67E5\u7F51\u7EDC\u4E0E\u4EE3\u7406";
      }
      return null;
    }
    module2.exports = { handleError: handleError2, buildHint };
  }
});

// lib/output.js
var require_output = __commonJS({
  "lib/output.js"(exports2, module2) {
    function output2(data, format = "json") {
      if (data === null || data === void 0) {
        console.log("(\u7A7A)");
        return;
      }
      if (format === "yaml") {
        process.stdout.write(toYaml(data));
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
        renderTable(data);
        return;
      }
      if (typeof data !== "object") {
        console.log(String(data));
        return;
      }
      const arrayKey = Object.keys(data).find(
        (k) => Array.isArray(data[k]) && data[k].length > 0 && typeof data[k][0] === "object"
      );
      if (!arrayKey) {
        renderKeyValue(data);
        return;
      }
      const scalars = Object.entries(data).filter(([, v]) => v === null || typeof v !== "object");
      if (scalars.length) {
        console.log(scalars.map(([k, v]) => `${k}: ${v}`).join("  "));
        console.log("");
      }
      renderTable(data[arrayKey]);
    }
    function renderKeyValue(data) {
      const rows = [];
      flatten(data, "", rows);
      const width = Math.max(...rows.map(([k]) => displayWidth(k)));
      const sep = "-".repeat(width + 2) + "+" + "-".repeat(52);
      console.log(sep);
      for (const [k, v] of rows) {
        const value = String(v).replace(/\s+/g, " ");
        console.log(` ${pad(k, width)} | ${value.length > 100 ? `${value.slice(0, 97)}...` : value}`);
      }
      console.log(sep);
    }
    function flatten(value, prefix, out) {
      if (value === null || typeof value !== "object") {
        out.push([prefix, value]);
        return;
      }
      if (Array.isArray(value)) {
        out.push([prefix, value.length ? value.join(", ") : "[]"]);
        return;
      }
      const entries = Object.entries(value);
      if (entries.length === 0) {
        out.push([prefix, "{}"]);
        return;
      }
      for (const [k, v] of entries) {
        flatten(v, prefix ? `${prefix}.${k}` : k, out);
      }
    }
    function renderTable(items) {
      if (items.length === 0) {
        console.log("(\u65E0\u7ED3\u679C)");
        return;
      }
      const hinted = items[0]._columns;
      const columns = Array.isArray(hinted) ? hinted : Object.keys(items[0]).filter(
        (k) => items[0][k] === null || typeof items[0][k] !== "object"
      );
      if (columns.length === 0) {
        console.log(JSON.stringify(items, null, 2));
        return;
      }
      const rows = items.map(
        (item) => columns.map((c) => {
          const v = item[c];
          if (v === null || v === void 0) return "";
          const s = (Array.isArray(v) ? v.join(",") : String(v)).replace(/\s+/g, " ");
          return s.length > 60 ? `${s.slice(0, 57)}...` : s;
        })
      );
      const widths = columns.map(
        (c, i) => Math.max(displayWidth(c), ...rows.map((r) => displayWidth(r[i])))
      );
      const sep = widths.map((w) => "-".repeat(w + 2)).join("+");
      console.log(sep);
      console.log(columns.map((c, i) => ` ${pad(c, widths[i])} `).join("|"));
      console.log(sep);
      for (const row of rows) {
        console.log(row.map((c, i) => ` ${pad(c, widths[i])} `).join("|"));
      }
      console.log(sep);
    }
    function pad(str, width) {
      const diff = width - displayWidth(str);
      return diff > 0 ? str + " ".repeat(diff) : str;
    }
    function displayWidth(str) {
      let width = 0;
      for (const ch of String(str)) {
        width += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/.test(ch) ? 2 : 1;
      }
      return width;
    }
    function toYaml(data, indent = 0) {
      const pad2 = "  ".repeat(indent);
      if (data === null || data === void 0) return `${pad2}null
`;
      if (typeof data !== "object") return `${pad2}${scalar(data)}
`;
      if (Array.isArray(data)) {
        if (data.length === 0) return `${pad2}[]
`;
        return data.map((item) => {
          if (item === null || typeof item !== "object") return `${pad2}- ${scalar(item)}
`;
          const body = toYaml(item, indent + 1);
          return `${pad2}- ${body.slice(pad2.length + 2)}`;
        }).join("");
      }
      const entries = Object.entries(data).filter(([, v]) => v !== void 0);
      if (entries.length === 0) return `${pad2}{}
`;
      return entries.map(([k, v]) => {
        if (v !== null && typeof v === "object") {
          const empty = Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0;
          if (empty) return `${pad2}${k}: ${Array.isArray(v) ? "[]" : "{}"}
`;
          return `${pad2}${k}:
${toYaml(v, indent + 1)}`;
        }
        return `${pad2}${k}: ${scalar(v)}
`;
      }).join("");
    }
    function scalar(v) {
      if (v === null || v === void 0) return "null";
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      const s = String(v);
      if (s === "" || /^[\s]|[\s]$|[:#\-?&*!|>'"%@`{}\[\],]|^$/.test(s) || /^(true|false|null|~|\d+(\.\d+)?)$/i.test(s)) {
        return JSON.stringify(s);
      }
      return s;
    }
    module2.exports = output2;
    module2.exports.toYaml = toYaml;
  }
});

// lib/cmd/memo.js
var require_memo = __commonJS({
  "lib/cmd/memo.js"(exports2, module2) {
    var { apiRequest, normalizeMemoUid, getConfig } = require_api();
    var VISIBILITIES = ["PRIVATE", "PROTECTED", "PUBLIC"];
    function normalizeVisibility(value) {
      if (!value) return "PRIVATE";
      const upper = String(value).toUpperCase();
      if (!VISIBILITIES.includes(upper)) {
        throw new Error(`visibility \u53D6\u503C\u975E\u6CD5\uFF1A${value}\uFF08\u53EF\u9009 ${VISIBILITIES.join(" / ")}\uFF09`);
      }
      return upper;
    }
    function simplifyMemo(memo) {
      const uid = normalizeMemoUid(memo.name);
      return {
        uid,
        state: memo.state,
        visibility: memo.visibility,
        pinned: memo.pinned,
        creator: memo.creator,
        createTime: memo.createTime,
        updateTime: memo.updateTime,
        tags: memo.tags || [],
        content: memo.content,
        snippet: memo.snippet
      };
    }
    async function cmdMemoList(args, options) {
      const config = getConfig(options);
      const filter = buildFilter(options);
      const res = await apiRequest("GET", "/api/v1/memos", {
        config,
        query: {
          pageSize: options.limit || options.pagesize || 50,
          pageToken: options.pagetoken,
          filter,
          orderBy: options.orderby || "create_time desc",
          state: options.archived ? "ARCHIVED" : options.state ? String(options.state).toUpperCase() : void 0
        }
      });
      const memos = (res.memos || []).map(simplifyMemo);
      return {
        count: memos.length,
        nextPageToken: res.nextPageToken || "",
        memos
      };
    }
    function buildFilter(options) {
      const terms = [];
      if (options.filter) terms.push(String(options.filter));
      if (options.tag) terms.push(`"${escapeCel(options.tag)}" in tags`);
      if (options.search) terms.push(`content.contains("${escapeCel(options.search)}")`);
      if (options.visibility) {
        terms.push(`visibility == "${normalizeVisibility(options.visibility)}"`);
      }
      if (options.pinned) terms.push("pinned == true");
      if (options.since) {
        const dur = parseDuration(options.since);
        if (dur) terms.push(`created_ts > now - duration("${dur}")`);
        else terms.push(`created_ts > timestamp("${escapeCel(options.since)}")`);
      }
      return terms.length ? terms.join(" && ") : void 0;
    }
    function escapeCel(value) {
      return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    }
    function parseDuration(value) {
      const m = String(value).trim().match(/^(\d+)([smhdw])$/i);
      if (!m) return null;
      const n = parseInt(m[1], 10);
      const unit = m[2].toLowerCase();
      const hours = { s: n / 3600, m: n / 60, h: n, d: n * 24, w: n * 168 }[unit];
      return `${hours}h`;
    }
    async function cmdMemoGet(args, options) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error("\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo get <uid>");
      const config = getConfig(options);
      const memo = await apiRequest("GET", `/api/v1/memos/${encodeURIComponent(uid)}`, { config });
      return simplifyMemo(memo);
    }
    async function cmdMemoCreate(args, options) {
      const content = options.content !== void 0 ? String(options.content) : args.join(" ");
      if (!content) throw new Error("\u7F3A\u5C11\u5185\u5BB9\uFF0C\u7528\u6CD5\uFF1Amemo create <\u5185\u5BB9> \u6216 memo create --content <\u5185\u5BB9>");
      const config = getConfig(options);
      const memo = await apiRequest("POST", "/api/v1/memos", {
        config,
        query: { memoId: options.memoid },
        body: {
          content,
          visibility: normalizeVisibility(options.visibility),
          ...options.pinned ? { pinned: true } : {}
        }
      });
      return simplifyMemo(memo);
    }
    async function cmdMemoUpdate(args, options) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error("\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo update <uid> [--content <\u5185\u5BB9>] [--visibility <\u503C>]");
      const fields = [];
      const body = {};
      if (options.content !== void 0) {
        body.content = String(options.content);
        fields.push("content");
      } else if (args.length > 1) {
        body.content = args.slice(1).join(" ");
        fields.push("content");
      }
      if (options.visibility !== void 0) {
        body.visibility = normalizeVisibility(options.visibility);
        fields.push("visibility");
      }
      if (options.pinned !== void 0) {
        body.pinned = options.pinned !== "false";
        fields.push("pinned");
      }
      if (fields.length === 0) {
        throw new Error("\u6CA1\u6709\u9700\u8981\u66F4\u65B0\u7684\u5B57\u6BB5\uFF1A\u8BF7\u63D0\u4F9B --content / --visibility / --pinned");
      }
      const config = getConfig(options);
      const memo = await apiRequest("PATCH", `/api/v1/memos/${encodeURIComponent(uid)}`, {
        config,
        query: { updateMask: fields.join(",") },
        body
      });
      return simplifyMemo(memo);
    }
    async function cmdMemoDelete(args, options) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error("\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo delete <uid>");
      const config = getConfig(options);
      await apiRequest("DELETE", `/api/v1/memos/${encodeURIComponent(uid)}`, {
        config,
        query: { force: options.force ? "true" : void 0 }
      });
      return { deleted: true, uid };
    }
    async function setMemoState(args, options, state) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error(`\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo ${state === "ARCHIVED" ? "archive" : "restore"} <uid>`);
      const config = getConfig(options);
      const memo = await apiRequest("PATCH", `/api/v1/memos/${encodeURIComponent(uid)}`, {
        config,
        query: { updateMask: "state" },
        body: { state }
      });
      return simplifyMemo(memo);
    }
    var cmdMemoArchive = (args, options) => setMemoState(args, options, "ARCHIVED");
    var cmdMemoRestore = (args, options) => setMemoState(args, options, "NORMAL");
    async function setMemoPinned(args, options, pinned) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error(`\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo ${pinned ? "pin" : "unpin"} <uid>`);
      const config = getConfig(options);
      const memo = await apiRequest("PATCH", `/api/v1/memos/${encodeURIComponent(uid)}`, {
        config,
        query: { updateMask: "pinned" },
        body: { pinned }
      });
      return simplifyMemo(memo);
    }
    var cmdMemoPin = (args, options) => setMemoPinned(args, options, true);
    var cmdMemoUnpin = (args, options) => setMemoPinned(args, options, false);
    async function cmdMemoComments(args, options) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error("\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo comments <uid>");
      const config = getConfig(options);
      const res = await apiRequest("GET", `/api/v1/memos/${encodeURIComponent(uid)}/comments`, {
        config,
        query: { pageSize: options.limit, orderBy: options.orderby }
      });
      const comments = (res.memos || []).map(simplifyMemo);
      return { count: comments.length, comments };
    }
    async function cmdMemoComment(args, options) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error("\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo comment <uid> <\u5185\u5BB9>");
      const content = options.content !== void 0 ? String(options.content) : args.slice(1).join(" ");
      if (!content) throw new Error("\u7F3A\u5C11\u8BC4\u8BBA\u5185\u5BB9\uFF0C\u7528\u6CD5\uFF1Amemo comment <uid> <\u5185\u5BB9>");
      const config = getConfig(options);
      const memo = await apiRequest("POST", `/api/v1/memos/${encodeURIComponent(uid)}/comments`, {
        config,
        body: {
          content,
          visibility: normalizeVisibility(options.visibility)
        }
      });
      return simplifyMemo(memo);
    }
    async function cmdMemoReactions(args, options) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error("\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo reactions <uid>");
      const config = getConfig(options);
      const res = await apiRequest("GET", `/api/v1/memos/${encodeURIComponent(uid)}/reactions`, {
        config
      });
      const reactions = (res.reactions || []).map((r) => ({
        id: String(r.name || "").split("/").pop(),
        reactionType: r.reactionType,
        creator: r.creator,
        createTime: r.createTime
      }));
      return { count: reactions.length, reactions };
    }
    async function cmdMemoReact(args, options) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error("\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo react <uid> <\u8868\u60C5>");
      const reactionType = options.type || args[1];
      if (!reactionType) throw new Error("\u7F3A\u5C11\u8868\u60C5\uFF0C\u7528\u6CD5\uFF1Amemo react <uid> \u{1F44D}");
      const config = getConfig(options);
      const res = await apiRequest("POST", `/api/v1/memos/${encodeURIComponent(uid)}/reactions`, {
        config,
        body: { reaction: { reactionType } }
      });
      return {
        id: String(res.name || "").split("/").pop(),
        reactionType: res.reactionType,
        creator: res.creator,
        createTime: res.createTime
      };
    }
    async function cmdMemoUnreact(args, options) {
      const uid = normalizeMemoUid(args[0]);
      if (!uid) throw new Error("\u7F3A\u5C11 memo uid\uFF0C\u7528\u6CD5\uFF1Amemo unreact <uid> <\u56DE\u5E94id>");
      const reactionId = options.id || args[1];
      if (!reactionId) {
        throw new Error("\u7F3A\u5C11\u56DE\u5E94 id\uFF1A\u5148\u6267\u884C `memo reactions <uid>` \u67E5\u770B id\uFF0C\u518D `memo unreact <uid> <id>`");
      }
      const config = getConfig(options);
      await apiRequest(
        "DELETE",
        `/api/v1/memos/${encodeURIComponent(uid)}/reactions/${encodeURIComponent(reactionId)}`,
        { config }
      );
      return { deleted: true, uid, reactionId };
    }
    async function cmdMemoTags(args, options) {
      const config = getConfig(options);
      const limit = parseInt(options.limit || "200", 10);
      const res = await apiRequest("GET", "/api/v1/memos", {
        config,
        query: { pageSize: Math.min(limit, 1e3), state: options.archived ? "ARCHIVED" : void 0 }
      });
      const counts = /* @__PURE__ */ new Map();
      for (const memo of res.memos || []) {
        for (const tag of memo.tags || []) {
          counts.set(tag, (counts.get(tag) || 0) + 1);
        }
      }
      const tags = [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
      return { scanned: (res.memos || []).length, count: tags.length, tags };
    }
    module2.exports = {
      cmdMemoList,
      cmdMemoGet,
      cmdMemoCreate,
      cmdMemoUpdate,
      cmdMemoDelete,
      cmdMemoArchive,
      cmdMemoRestore,
      cmdMemoPin,
      cmdMemoUnpin,
      cmdMemoComments,
      cmdMemoComment,
      cmdMemoReactions,
      cmdMemoReact,
      cmdMemoUnreact,
      cmdMemoTags,
      simplifyMemo,
      normalizeVisibility
    };
  }
});

// lib/cmd/attachment.js
var require_attachment = __commonJS({
  "lib/cmd/attachment.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var { apiRequest, normalizeMemoUid, getConfig } = require_api();
    function simplifyAttachment(att) {
      return {
        uid: String(att.name || "").split("/").pop(),
        filename: att.filename,
        type: att.type,
        size: att.size,
        createTime: att.createTime,
        memo: att.memo || "",
        externalLink: att.externalLink || ""
      };
    }
    function guessMime(filePath) {
      const ext = path.extname(filePath).toLowerCase();
      const table = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".json": "application/json",
        ".csv": "text/csv",
        ".zip": "application/zip",
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4"
      };
      return table[ext] || "application/octet-stream";
    }
    async function cmdAttachmentList(args, options) {
      const config = getConfig(options);
      const res = await apiRequest("GET", "/api/v1/attachments", {
        config,
        query: { pageSize: options.limit, pageToken: options.pagetoken, filter: options.filter }
      });
      const attachments = (res.attachments || []).map(simplifyAttachment);
      return { count: attachments.length, nextPageToken: res.nextPageToken || "", attachments };
    }
    async function cmdAttachmentGet(args, options) {
      const uid = String(args[0] || "").replace(/^attachments\//, "");
      if (!uid) throw new Error("\u7F3A\u5C11\u9644\u4EF6 uid\uFF0C\u7528\u6CD5\uFF1Aattachment get <uid>");
      const config = getConfig(options);
      const att = await apiRequest("GET", `/api/v1/attachments/${encodeURIComponent(uid)}`, { config });
      return simplifyAttachment(att);
    }
    async function cmdAttachmentUpload(args, options) {
      const filePath = args[0];
      if (!filePath) throw new Error("\u7F3A\u5C11\u672C\u5730\u6587\u4EF6\u8DEF\u5F84\uFF0C\u7528\u6CD5\uFF1Aattachment upload <\u672C\u5730\u6587\u4EF6> [--memo <uid>]");
      if (!fs.existsSync(filePath)) throw new Error(`\u672C\u5730\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${filePath}`);
      const buffer = fs.readFileSync(filePath);
      const filename = options.filename || path.basename(filePath);
      const type = options.type || guessMime(filePath);
      const config = getConfig(options);
      const att = await apiRequest("POST", "/api/v1/attachments", {
        config,
        body: {
          filename,
          type,
          content: buffer.toString("base64"),
          ...options.memo ? { memo: `memos/${normalizeMemoUid(options.memo)}` } : {}
        }
      });
      const result = simplifyAttachment(att);
      result.url = `${config.baseUrl}/file/attachments/${result.uid}/${encodeURIComponent(filename)}`;
      result.bytes = buffer.length;
      return result;
    }
    async function cmdAttachmentDownload(args, options) {
      const uid = String(args[0] || "").replace(/^attachments\//, "");
      if (!uid) throw new Error("\u7F3A\u5C11\u9644\u4EF6 uid\uFF0C\u7528\u6CD5\uFF1Aattachment download <uid> [--out <\u672C\u5730\u8DEF\u5F84>]");
      const config = getConfig(options);
      const meta = await apiRequest("GET", `/api/v1/attachments/${encodeURIComponent(uid)}`, { config });
      const outPath = options.out || meta.filename || `${uid}.bin`;
      const buffer = await apiRequest(
        "GET",
        `/file/attachments/${encodeURIComponent(uid)}/${encodeURIComponent(meta.filename)}`,
        { config, accept: "buffer" }
      );
      fs.writeFileSync(outPath, buffer);
      return {
        downloaded: true,
        uid,
        filename: meta.filename,
        type: meta.type,
        bytes: buffer.length,
        path: path.resolve(outPath)
      };
    }
    async function cmdAttachmentDelete(args, options) {
      const uid = String(args[0] || "").replace(/^attachments\//, "");
      if (!uid) throw new Error("\u7F3A\u5C11\u9644\u4EF6 uid\uFF0C\u7528\u6CD5\uFF1Aattachment delete <uid>");
      const config = getConfig(options);
      await apiRequest("DELETE", `/api/v1/attachments/${encodeURIComponent(uid)}`, { config });
      return { deleted: true, uid };
    }
    module2.exports = {
      cmdAttachmentList,
      cmdAttachmentGet,
      cmdAttachmentUpload,
      cmdAttachmentDownload,
      cmdAttachmentDelete
    };
  }
});

// lib/cmd/user.js
var require_user = __commonJS({
  "lib/cmd/user.js"(exports2, module2) {
    var { apiRequest, getConfig } = require_api();
    function simplifyUser(user) {
      return {
        name: user.name,
        username: user.username,
        displayName: user.displayName || "",
        role: user.role,
        state: user.state,
        email: user.email || "",
        description: user.description || "",
        avatarUrl: user.avatarUrl || "",
        createTime: user.createTime,
        updateTime: user.updateTime
      };
    }
    async function cmdUserList(args, options) {
      const config = getConfig(options);
      const res = await apiRequest("GET", "/api/v1/users", {
        config,
        query: { pageSize: options.limit, pageToken: options.pagetoken, filter: options.filter }
      });
      const users = (res.users || []).map(simplifyUser);
      return { count: users.length, nextPageToken: res.nextPageToken || "", users };
    }
    async function cmdUserGet(args, options) {
      const username = args[0];
      if (!username) throw new Error("\u7F3A\u5C11\u7528\u6237\u540D\uFF0C\u7528\u6CD5\uFF1Auser get <\u7528\u6237\u540D>");
      const config = getConfig(options);
      const user = await apiRequest("GET", `/api/v1/users/${encodeURIComponent(username)}`, { config });
      return simplifyUser(user);
    }
    async function cmdUserMe(args, options) {
      const config = getConfig(options);
      const res = await apiRequest("GET", "/api/v1/users", { config, query: { pageSize: 1 } });
      const first = (res.users || [])[0];
      if (!first) throw new Error("\u65E0\u6CD5\u786E\u5B9A\u5F53\u524D\u8D26\u53F7\uFF1A\u5B9E\u4F8B\u4E2D\u67E5\u4E0D\u5230\u4EFB\u4F55\u7528\u6237");
      return {
        ...simplifyUser(first),
        note: "Memos \u65E0 /users/me \u63A5\u53E3\uFF0C\u6B64\u5904\u8FD4\u56DE\u7684\u662F\u5B9E\u4F8B\u7528\u6237\u5217\u8868\u4E2D\u7684\u9996\u4E2A\u8D26\u53F7\uFF08\u5355\u7528\u6237\u5B9E\u4F8B\u5373\u5F53\u524D\u8D26\u53F7\uFF09"
      };
    }
    async function cmdUserStats(args, options) {
      const username = args[0] || options.user;
      if (!username) throw new Error("\u7F3A\u5C11\u7528\u6237\u540D\uFF0C\u7528\u6CD5\uFF1Auser stats <\u7528\u6237\u540D>");
      const config = getConfig(options);
      const stats = await apiRequest(
        "GET",
        `/api/v1/users/${encodeURIComponent(username)}:getStats`,
        { config }
      );
      return {
        name: stats.name,
        memoTypeStats: stats.memoTypeStats || {},
        tagCount: stats.tagCount || {},
        createdCount: (stats.memoCreatedTimestamps || []).length,
        updatedCount: (stats.memoUpdatedTimestamps || []).length
      };
    }
    module2.exports = {
      cmdUserList,
      cmdUserGet,
      cmdUserMe,
      cmdUserStats
    };
  }
});

// lib/cmd/instance.js
var require_instance = __commonJS({
  "lib/cmd/instance.js"(exports2, module2) {
    var { apiRequest, getConfig } = require_api();
    async function cmdInstanceProfile(args, options) {
      const config = getConfig(options);
      const profile = await apiRequest("GET", "/api/v1/instance/profile", { config });
      const admin = profile.admin || {};
      return {
        version: profile.version,
        instanceUrl: profile.instanceUrl,
        commit: profile.commit,
        demo: profile.demo,
        needsSetup: profile.needsSetup,
        accessMode: profile.accessMode,
        admin: admin.username || admin.name || ""
      };
    }
    async function cmdInstanceStats(args, options) {
      const config = getConfig(options);
      const stats = await apiRequest("GET", "/api/v1/instance/stats", { config });
      return {
        database: stats.database || {},
        localStorageBytes: stats.localStorageBytes,
        generatedTime: stats.generatedTime
      };
    }
    module2.exports = {
      cmdInstanceProfile,
      cmdInstanceStats
    };
  }
});

// lib/cmd/index.js
var require_cmd = __commonJS({
  "lib/cmd/index.js"(exports2, module2) {
    var memo = require_memo();
    var attachment = require_attachment();
    var user = require_user();
    var instance = require_instance();
    module2.exports = {
      ...memo,
      ...attachment,
      ...user,
      ...instance
    };
  }
});

// run.js
var { SKILL_VERSION } = require_api();
var { parseArgs } = require_parser();
var { handleError } = require_errors();
var output = require_output();
var cmd = require_cmd();
function showHelp() {
  console.log(`
Memos API \u5BA2\u6237\u7AEF v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <\u5BF9\u8C61> <\u5B50\u547D\u4EE4> [\u53C2\u6570...] [\u9009\u9879]

memo \u547D\u4EE4:
  memo list [\u9009\u9879]                    \u5217\u51FA memo\uFF08\u9ED8\u8BA4\u6309\u521B\u5EFA\u65F6\u95F4\u5012\u5E8F\uFF09
  memo get <uid>                      \u67E5\u770B\u5355\u6761 memo
  memo create <\u5185\u5BB9>                  \u65B0\u5EFA memo\uFF08\u5185\u5BB9\u4E5F\u53EF\u7528 --content \u4F20\u5165\uFF09
  memo update <uid> [\u9009\u9879]            \u4FEE\u6539\u5185\u5BB9 / \u53EF\u89C1\u6027 / \u7F6E\u9876
  memo delete <uid>                   \u5220\u9664 memo\uFF08\u52A0 --force \u5F3A\u5236\u5220\u9664\uFF09
  memo archive <uid>                  \u5F52\u6863 memo
  memo restore <uid>                  \u4ECE\u5F52\u6863\u6062\u590D
  memo pin <uid>                      \u7F6E\u9876
  memo unpin <uid>                    \u53D6\u6D88\u7F6E\u9876
  memo comments <uid>                 \u5217\u51FA\u8BC4\u8BBA
  memo comment <uid> <\u5185\u5BB9>           \u6DFB\u52A0\u8BC4\u8BBA
  memo reactions <uid>                \u5217\u51FA\u8868\u60C5\u56DE\u5E94
  memo react <uid> <\u8868\u60C5>             \u6DFB\u52A0\u8868\u60C5\u56DE\u5E94\uFF08\u5982 \u{1F44D}\uFF09
  memo unreact <uid> <id>             \u5220\u9664\u8868\u60C5\u56DE\u5E94
  memo tags [--limit n]               \u7EDF\u8BA1\u5F53\u524D\u53EF\u89C1 memo \u7684\u6807\u7B7E\u53CA\u6570\u91CF

attachment \u547D\u4EE4:
  attachment list [\u9009\u9879]              \u5217\u51FA\u9644\u4EF6
  attachment get <uid>                \u67E5\u770B\u9644\u4EF6\u5143\u4FE1\u606F
  attachment upload <\u672C\u5730\u6587\u4EF6>        \u4E0A\u4F20\u6587\u4EF6\uFF08--memo <uid> \u53EF\u5173\u8054\u5230 memo\uFF09
  attachment download <uid>           \u4E0B\u8F7D\u9644\u4EF6\uFF08--out <\u8DEF\u5F84> \u6307\u5B9A\u4FDD\u5B58\u4F4D\u7F6E\uFF09
  attachment delete <uid>             \u5220\u9664\u9644\u4EF6

user \u547D\u4EE4:
  user list [--limit n]               \u5217\u51FA\u5B9E\u4F8B\u7528\u6237
  user get <\u7528\u6237\u540D>                   \u67E5\u770B\u6307\u5B9A\u7528\u6237
  user me                             \u67E5\u770B\u5F53\u524D\u8D26\u53F7
  user stats <\u7528\u6237\u540D>                 \u7528\u6237\u7EDF\u8BA1\uFF08memo \u6570\u3001\u6807\u7B7E\u6570\uFF09

instance \u547D\u4EE4:
  instance profile                    \u5B9E\u4F8B\u4FE1\u606F\uFF08\u7248\u672C\u3001\u7BA1\u7406\u5458\u3001\u8BBF\u95EE\u6A21\u5F0F\uFF09
  instance stats                      \u5B9E\u4F8B\u5B58\u50A8\u7EDF\u8BA1

memo list \u9009\u9879:
  --limit, -n <\u6570\u91CF>      \u8FD4\u56DE\u6761\u6570\u4E0A\u9650\uFF08\u9ED8\u8BA4 50\uFF0C\u6700\u5927 1000\uFF09
  --tag <\u6807\u7B7E>            \u6309\u6807\u7B7E\u8FC7\u6EE4\uFF08\u4E0D\u542B #\uFF09
  --search <\u5173\u952E\u5B57>       \u6309\u5185\u5BB9\u5173\u952E\u5B57\u8FC7\u6EE4\uFF08\u652F\u6301\u4E2D\u6587\uFF09
  --visibility <\u503C>       \u6309\u53EF\u89C1\u6027\u8FC7\u6EE4\uFF1APRIVATE | PROTECTED | PUBLIC
  --since <\u65F6\u957F>          \u6309\u521B\u5EFA\u65F6\u95F4\u8FC7\u6EE4\uFF1A7d / 24h / 30m\uFF0C\u6216 ISO \u65F6\u95F4\u6233
  --pinned                \u53EA\u770B\u7F6E\u9876
  --archived              \u53EA\u770B\u5F52\u6863\uFF08\u9ED8\u8BA4\u53EA\u770B\u6B63\u5E38\uFF09
  --orderby <\u8868\u8FBE\u5F0F>      \u6392\u5E8F\uFF0C\u5982 "pinned desc, create_time desc"
  --filter <CEL>          \u539F\u751F CEL \u8FC7\u6EE4\u8868\u8FBE\u5F0F\uFF08\u4E0E\u4E0A\u9762\u9009\u9879\u4EE5 && \u7EC4\u5408\uFF09
  --pagetoken <token>     \u7FFB\u9875\u4EE4\u724C\uFF08\u53D6\u81EA\u4E0A\u6B21\u54CD\u5E94\u7684 nextPageToken\uFF09

\u901A\u7528\u9009\u9879:
  --url <\u5730\u5740>            Memos \u5B9E\u4F8B\u5730\u5740\uFF08\u9ED8\u8BA4\u53D6 MEMOS_URL\uFF0C\u518D\u9ED8\u8BA4 http://localhost:5230\uFF09
  --token <\u4EE4\u724C>          \u4E2A\u4EBA\u8BBF\u95EE\u4EE4\u724C\uFF08\u9ED8\u8BA4\u53D6 MEMOS_TOKEN\uFF09
  --format <\u683C\u5F0F>         \u8F93\u51FA\u683C\u5F0F\uFF1Ajson\uFF08\u9ED8\u8BA4\uFF09| yaml | table
  --timeout <\u6BEB\u79D2>        \u8BF7\u6C42\u8D85\u65F6\uFF08\u9ED8\u8BA4 30000\uFF09
  --insecure              \u8DF3\u8FC7 TLS \u8BC1\u4E66\u6821\u9A8C\uFF08\u81EA\u7B7E\u540D\u8BC1\u4E66\u573A\u666F\uFF09
  -h, --help              \u663E\u793A\u5E2E\u52A9
  -v, --version           \u663E\u793A\u7248\u672C

\u793A\u4F8B:
  node skill.js memo create "\u4ECA\u5929\u8BFB\u4E86 #Rust \u6240\u6709\u6743\u7AE0\u8282" --url http://localhost:5230 --token xxx
  node skill.js memo list --tag Rust --limit 10
  node skill.js memo list --search \u6240\u6709\u6743 --since 7d --format yaml
  node skill.js memo update abc123 --content "\u4FEE\u8BA2\u540E\u7684\u5185\u5BB9" --visibility PUBLIC
  node skill.js memo comment abc123 "\u8FD9\u6761\u8BC4\u8BBA\u5F88\u6709\u7528"
  node skill.js memo react abc123 \u{1F44D}
  node skill.js attachment upload ./diagram.png --memo abc123

\u73AF\u5883\u53D8\u91CF:
  MEMOS_URL        \u5B9E\u4F8B\u5730\u5740
  MEMOS_TOKEN      \u4E2A\u4EBA\u8BBF\u95EE\u4EE4\u724C\uFF08Memos \u7F51\u9875\u7AEF\u300C\u8BBE\u7F6E \u2192 \u8BBF\u95EE\u4EE4\u724C\u300D\u521B\u5EFA\uFF09
  MEMOS_TIMEOUT    \u8BF7\u6C42\u8D85\u65F6\u6BEB\u79D2
  MEMOS_INSECURE   \u8BBE\u4E3A true \u8DF3\u8FC7 TLS \u6821\u9A8C
  \u4E5F\u53EF\u5728\u672C skill \u76EE\u5F55\u7684 .env \u4E2D\u914D\u7F6E\u4EE5\u4E0A\u53D8\u91CF\u3002

\u8F93\u51FA:
  \u7ED3\u679C\u8F93\u51FA JSON/YAML \u5230 stdout\uFF0C\u9519\u8BEF\u8F93\u51FA JSON \u5230 stderr\uFF0C\u4FBF\u4E8E\u7A0B\u5E8F\u4E0E LLM \u89E3\u6790\u3002
`);
}
function showVersion() {
  console.log(`Memos API \u5BA2\u6237\u7AEF v${SKILL_VERSION}`);
}
var DISPATCH = {
  memo: {
    list: cmd.cmdMemoList,
    ls: cmd.cmdMemoList,
    get: cmd.cmdMemoGet,
    show: cmd.cmdMemoGet,
    create: cmd.cmdMemoCreate,
    new: cmd.cmdMemoCreate,
    add: cmd.cmdMemoCreate,
    update: cmd.cmdMemoUpdate,
    edit: cmd.cmdMemoUpdate,
    delete: cmd.cmdMemoDelete,
    rm: cmd.cmdMemoDelete,
    archive: cmd.cmdMemoArchive,
    restore: cmd.cmdMemoRestore,
    pin: cmd.cmdMemoPin,
    unpin: cmd.cmdMemoUnpin,
    comments: cmd.cmdMemoComments,
    comment: cmd.cmdMemoComment,
    reactions: cmd.cmdMemoReactions,
    react: cmd.cmdMemoReact,
    unreact: cmd.cmdMemoUnreact,
    tags: cmd.cmdMemoTags
  },
  attachment: {
    list: cmd.cmdAttachmentList,
    ls: cmd.cmdAttachmentList,
    get: cmd.cmdAttachmentGet,
    upload: cmd.cmdAttachmentUpload,
    put: cmd.cmdAttachmentUpload,
    download: cmd.cmdAttachmentDownload,
    dl: cmd.cmdAttachmentDownload,
    delete: cmd.cmdAttachmentDelete,
    rm: cmd.cmdAttachmentDelete
  },
  user: {
    list: cmd.cmdUserList,
    ls: cmd.cmdUserList,
    get: cmd.cmdUserGet,
    me: cmd.cmdUserMe,
    stats: cmd.cmdUserStats
  },
  instance: {
    profile: cmd.cmdInstanceProfile,
    info: cmd.cmdInstanceProfile,
    stats: cmd.cmdInstanceStats
  }
};
async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  if (options.v || options.version) {
    showVersion();
    return;
  }
  if (positional.length === 0 || options.h || options.help) {
    showHelp();
    return;
  }
  const [objectName, subName, ...rest] = positional;
  const object = DISPATCH[objectName.toLowerCase()];
  if (!object) {
    handleError(
      new Error(`\u672A\u77E5\u5BF9\u8C61: ${objectName}`),
      `\u652F\u6301\u7684\u5BF9\u8C61\uFF1A${Object.keys(DISPATCH).join(" / ")}`,
      2
    );
    return;
  }
  if (!subName) {
    handleError(
      new Error("\u7F3A\u5C11\u5B50\u547D\u4EE4"),
      `${objectName} \u7684\u5B50\u547D\u4EE4\uFF1A${[...new Set(Object.keys(object))].join(" / ")}`,
      2
    );
    return;
  }
  const handler = object[subName.toLowerCase()];
  if (!handler) {
    handleError(
      new Error(`\u672A\u77E5\u5B50\u547D\u4EE4: ${objectName} ${subName}`),
      `${objectName} \u7684\u5B50\u547D\u4EE4\uFF1A${[...new Set(Object.keys(object))].join(" / ")}`,
      2
    );
    return;
  }
  try {
    const result = await handler(rest, options);
    output(result, String(options.format || "json").toLowerCase());
  } catch (e) {
    handleError(e, `${objectName} ${subName} \u6267\u884C\u5931\u8D25`);
  }
}
main();
