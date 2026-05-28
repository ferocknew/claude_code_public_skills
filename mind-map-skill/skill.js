#!/usr/bin/env node
// 思维导图远程控制工具 v260528.092109 - 无需安装依赖

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/api.js
var require_api = __commonJS({
  "lib/api.js"(exports2, module2) {
    var SKILL_VERSION2 = true ? "260528.092109" : "dev";
    var fs = require("fs");
    var path = require("path");
    function loadDotEnv2(baseDir) {
      const envPath = path.join(baseDir, ".env");
      if (!fs.existsSync(envPath)) return;
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
    function getConfig() {
      return {
        url: process.env.MIND_MAP_URL || "http://localhost:8086",
        token: process.env.MIND_MAP_API_TOKEN || "",
        userId: process.env.MIND_MAP_USER_ID || "",
        rejectUnauthorized: process.env.MIND_MAP_REJECT_UNAUTHORIZED !== "false"
      };
    }
    function initTls2() {
      const config = getConfig();
      if (!config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }
    }
    function saveUserIdToEnv(baseDir, userId) {
      const envPath = path.join(baseDir, ".env");
      let content = "";
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, "utf8");
      }
      const lines = content.split("\n");
      let found = false;
      const newLines = lines.map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("MIND_MAP_USER_ID=")) {
          found = true;
          return `MIND_MAP_USER_ID=${userId}`;
        }
        return line;
      });
      if (!found) {
        const last = newLines[newLines.length - 1];
        if (last && last.trim() !== "") {
          newLines.push("");
        }
        newLines.push(`MIND_MAP_USER_ID=${userId}`);
      }
      fs.writeFileSync(envPath, newLines.join("\n"), "utf8");
      process.env.MIND_MAP_USER_ID = userId;
    }
    async function apiRequest(method, path2, body, overrides) {
      const config = getConfig();
      const baseUrl = overrides && overrides.url || config.url;
      const token = overrides && overrides.token !== void 0 ? overrides.token : config.token;
      const userId = config.userId;
      const url = `${baseUrl}${path2}`;
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (userId) {
        headers["X-User-Id"] = userId;
      }
      const options = {
        method,
        headers,
        signal: AbortSignal.timeout(15e3)
      };
      if (body && method === "POST") {
        options.body = JSON.stringify(body);
      }
      try {
        const res = await fetch(url, options);
        const data = await res.json();
        if (!res.ok) {
          return {
            success: false,
            error: `HTTP ${res.status}`,
            message: data.error || data.message || `\u8BF7\u6C42\u5931\u8D25: ${res.status}`
          };
        }
        return data;
      } catch (e) {
        if (e.name === "TimeoutError" || e.name === "AbortError") {
          return { success: false, error: "\u8BF7\u6C42\u8D85\u65F6", message: `\u8FDE\u63A5 ${baseUrl} \u8D85\u65F6\uFF0815s\uFF09\uFF0C\u8BF7\u68C0\u67E5\u670D\u52A1\u5668\u5730\u5740\u548C\u7F51\u7EDC` };
        }
        return { success: false, error: "\u8BF7\u6C42\u5931\u8D25", message: e.message };
      }
    }
    module2.exports = { SKILL_VERSION: SKILL_VERSION2, loadDotEnv: loadDotEnv2, getConfig, initTls: initTls2, apiRequest, saveUserIdToEnv };
  }
});

// lib/formatter.js
var require_formatter = __commonJS({
  "lib/formatter.js"(exports2, module2) {
    function stripHtml(html) {
      if (!html) return "";
      return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
    }
    function getNodeText(data) {
      const raw = data.data ? data.data.text : data.text || "";
      return stripHtml(raw);
    }
    function getNodeUid(data) {
      return data.data ? data.data.uid : data.uid || "";
    }
    function formatTree(data, indent = 0) {
      if (!data) return "";
      const prefix = "  ".repeat(indent);
      const text = getNodeText(data);
      const uid = getNodeUid(data);
      const tags = [];
      if (data.data) {
        if (data.data.expand === false) tags.push("collapsed");
        if (data.data.note) tags.push("note");
        if (data.data.hyperlink) tags.push("link");
        if (data.data.image) tags.push("img");
      }
      const tagStr = tags.length > 0 ? ` [${tags.join(",")}]` : "";
      let result = `${prefix}${uid}: ${text}${tagStr}
`;
      const children = data.children || [];
      for (const child of children) {
        result += formatTree(child, indent + 1);
      }
      return result;
    }
    function formatSummary(data) {
      if (!data) return { error: "\u65E0\u6570\u636E" };
      const stats = getTreeStats(data);
      const rootText = getNodeText(data);
      const rootUid = getNodeUid(data);
      const children = data.children || [];
      const childList = children.map((c) => {
        const cText = getNodeText(c);
        const cUid = getNodeUid(c);
        const childCount = (c.children || []).length;
        return { uid: cUid, text: cText, children: childCount };
      });
      return {
        root: { uid: rootUid, text: rootText },
        totalNodes: stats.nodes,
        maxDepth: stats.depth,
        topChildren: childList
      };
    }
    function getTreeStats(data, currentDepth = 1) {
      if (!data) return { nodes: 0, depth: 0 };
      let nodes = 1;
      let depth = currentDepth;
      const children = data.children || [];
      for (const child of children) {
        const childStats = getTreeStats(child, currentDepth + 1);
        nodes += childStats.nodes;
        if (childStats.depth > depth) {
          depth = childStats.depth;
        }
      }
      return { nodes, depth };
    }
    function searchNodes(data, keyword, path) {
      if (!data) return [];
      const currentPath = path || [];
      const results = [];
      const text = getNodeText(data);
      const uid = getNodeUid(data);
      if (text && text.toLowerCase().includes(keyword.toLowerCase())) {
        results.push({
          uid,
          text,
          path: [...currentPath]
        });
      }
      const children = data.children || [];
      for (let i = 0; i < children.length; i++) {
        const childPath = [...currentPath, text || `#${i}`];
        results.push(...searchNodes(children[i], keyword, childPath));
      }
      return results;
    }
    module2.exports = { formatTree, formatSummary, getTreeStats, searchNodes };
  }
});

// lib/commands.js
var require_commands = __commonJS({
  "lib/commands.js"(exports2, module2) {
    var { apiRequest, getConfig } = require_api();
    var { formatTree, formatSummary, searchNodes } = require_formatter();
    function unwrapToolResult(result) {
      if (!result.success) return result;
      const toolResult = result.data;
      if (toolResult && typeof toolResult === "object" && "success" in toolResult) {
        return toolResult;
      }
      return result;
    }
    async function cmdExec2(command, argsJson, opts) {
      let args = {};
      if (argsJson) {
        try {
          args = JSON.parse(argsJson);
        } catch (e) {
          return { success: false, error: "\u53C2\u6570\u89E3\u6790\u5931\u8D25", message: `JSON \u683C\u5F0F\u9519\u8BEF: ${e.message}` };
        }
      }
      const result = await apiRequest("POST", "/api/mind-map/exec", { command, args }, opts);
      return unwrapToolResult(result);
    }
    async function cmdStatus2(opts) {
      return apiRequest("GET", "/api/mind-map/status", null, opts);
    }
    async function cmdRead2(opts) {
      const result = await apiRequest("GET", "/api/mind-map/read", null, opts);
      if (!result.success) return result;
      const toolResult = unwrapToolResult(result);
      if (!toolResult.success) {
        return { success: false, error: "\u8BFB\u53D6\u5931\u8D25", message: toolResult.message || "\u672A\u77E5\u9519\u8BEF" };
      }
      const format = opts.format || "tree";
      const data = toolResult.data;
      switch (format) {
        case "tree":
          return { success: true, format: "tree", tree: formatTree(data).trimEnd() };
        case "summary":
          return { success: true, format: "summary", ...formatSummary(data) };
        case "json":
          return { success: true, format: "json", data };
        default:
          return { success: true, format: "tree", tree: formatTree(data).trimEnd() };
      }
    }
    async function cmdAdd2(text, opts) {
      const body = { text };
      if (opts.parent) {
        body.parentUid = opts.parent;
      }
      const result = await apiRequest("POST", "/api/mind-map/add_node", body, opts);
      return unwrapToolResult(result);
    }
    async function cmdDelete2(uid, opts) {
      const result = await apiRequest("POST", "/api/mind-map/delete_node", { uid }, opts);
      return unwrapToolResult(result);
    }
    async function cmdUpdate2(uid, text, opts) {
      const result = await apiRequest("POST", "/api/mind-map/update_node", { uid, text }, opts);
      return unwrapToolResult(result);
    }
    async function cmdWrite2(jsonFile, opts) {
      const fs = require("fs");
      if (!fs.existsSync(jsonFile)) {
        return { success: false, error: "\u6587\u4EF6\u4E0D\u5B58\u5728", message: `\u627E\u4E0D\u5230\u6587\u4EF6: ${jsonFile}` };
      }
      let data;
      try {
        const content = fs.readFileSync(jsonFile, "utf8");
        data = JSON.parse(content);
      } catch (e) {
        return { success: false, error: "\u89E3\u6790\u5931\u8D25", message: `JSON \u89E3\u6790\u9519\u8BEF: ${e.message}` };
      }
      const result = await apiRequest("POST", "/api/mind-map/overwrite", { data }, opts);
      return unwrapToolResult(result);
    }
    async function cmdMove2(uid, targetUid, opts) {
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command: "MOVE_NODE_TO",
        args: { uid, targetUid }
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdUp2(uid, opts) {
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command: "UP_NODE",
        args: { uid }
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdDown2(uid, opts) {
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command: "DOWN_NODE",
        args: { uid }
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdInsert2(uid, text, opts) {
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command: "INSERT_NODE",
        args: { uid, appointData: { text, richText: true } }
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdInsertParent2(uid, text, opts) {
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command: "INSERT_PARENT_NODE",
        args: { uid, appointData: { text, richText: true } }
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdNote2(uid, note, opts) {
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command: "SET_NODE_NOTE",
        args: { uid, note }
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdLink2(uid, link, opts) {
      const title = opts.title || "";
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command: "SET_NODE_HYPERLINK",
        args: { uid, link, title }
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdUndo2(opts) {
      const step = parseInt(opts.step) || 1;
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command: "BACK",
        args: { step }
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdRedo2(opts) {
      const step = parseInt(opts.step) || 1;
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command: "FORWARD",
        args: { step }
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdExpand2(uid, opts) {
      const args = uid ? { uid, expand: true } : {};
      const command = uid ? "SET_NODE_EXPAND" : "EXPAND_ALL";
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command,
        args
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdCollapse2(uid, opts) {
      const args = uid ? { uid, expand: false } : {};
      const command = uid ? "SET_NODE_EXPAND" : "UNEXPAND_ALL";
      const result = await apiRequest("POST", "/api/mind-map/exec", {
        command,
        args
      }, opts);
      return unwrapToolResult(result);
    }
    async function cmdSearch2(keyword, opts) {
      const result = await apiRequest("GET", "/api/mind-map/read", null, opts);
      if (!result.success) return result;
      const toolResult = unwrapToolResult(result);
      if (!toolResult.success) {
        return { success: false, error: "\u641C\u7D22\u5931\u8D25", message: toolResult.message || "\u672A\u77E5\u9519\u8BEF" };
      }
      const data = toolResult.data;
      const matches = searchNodes(data, keyword);
      return {
        success: true,
        keyword,
        totalMatches: matches.length,
        results: matches.map((m) => ({
          uid: m.uid,
          text: m.text,
          path: m.path.join(" > ")
        }))
      };
    }
    async function cmdGeneralization2(action, uid, opts) {
      const body = { action, uid };
      if (opts.text !== void 0) body.text = opts.text;
      if (opts.range !== void 0) body.range = opts.range;
      if (opts.genUid !== void 0) body.genUid = opts.genUid;
      const result = await apiRequest("POST", "/api/mind-map/generalization", body, opts);
      return unwrapToolResult(result);
    }
    async function cmdAssociativeLine2(action, opts) {
      const body = { action };
      if (opts.fromUid !== void 0) body.fromUid = opts.fromUid;
      if (opts.toUid !== void 0) body.toUid = opts.toUid;
      if (opts.uid !== void 0) body.uid = opts.uid;
      if (opts.text !== void 0) body.text = opts.text;
      if (opts.style !== void 0) body.style = opts.style;
      const result = await apiRequest("POST", "/api/mind-map/associative_line", body, opts);
      return unwrapToolResult(result);
    }
    async function cmdFormula2(action, uid, opts) {
      const body = { action, uid };
      if (opts.latex !== void 0) body.latex = opts.latex;
      if (opts.index !== void 0) body.index = parseInt(opts.index);
      const result = await apiRequest("POST", "/api/mind-map/formula", body, opts);
      return unwrapToolResult(result);
    }
    async function cmdOuterFrame2(action, opts) {
      const body = { action };
      if (opts.uids !== void 0) body.uids = opts.uids;
      if (opts.uid !== void 0) body.uid = opts.uid;
      if (opts.groupId !== void 0) body.groupId = opts.groupId;
      if (opts.config !== void 0) body.config = opts.config;
      const result = await apiRequest("POST", "/api/mind-map/outer_frame", body, opts);
      return unwrapToolResult(result);
    }
    function cmdConfig2() {
      const config = getConfig();
      return {
        url: config.url,
        token: config.token ? "***" + config.token.slice(-4) : "(\u672A\u8BBE\u7F6E)",
        userId: config.userId || "(\u672A\u6388\u6743)",
        rejectUnauthorized: config.rejectUnauthorized
      };
    }
    module2.exports = {
      cmdStatus: cmdStatus2,
      cmdRead: cmdRead2,
      cmdAdd: cmdAdd2,
      cmdDelete: cmdDelete2,
      cmdUpdate: cmdUpdate2,
      cmdWrite: cmdWrite2,
      cmdConfig: cmdConfig2,
      cmdExec: cmdExec2,
      cmdMove: cmdMove2,
      cmdUp: cmdUp2,
      cmdDown: cmdDown2,
      cmdInsert: cmdInsert2,
      cmdInsertParent: cmdInsertParent2,
      cmdNote: cmdNote2,
      cmdLink: cmdLink2,
      cmdUndo: cmdUndo2,
      cmdRedo: cmdRedo2,
      cmdExpand: cmdExpand2,
      cmdCollapse: cmdCollapse2,
      cmdSearch: cmdSearch2,
      cmdGeneralization: cmdGeneralization2,
      cmdAssociativeLine: cmdAssociativeLine2,
      cmdFormula: cmdFormula2,
      cmdOuterFrame: cmdOuterFrame2
    };
  }
});

// lib/auth.js
var require_auth = __commonJS({
  "lib/auth.js"(exports2, module2) {
    var { apiRequest, getConfig, saveUserIdToEnv } = require_api();
    var { execSync } = require("child_process");
    async function cmdAuth2(opts, baseDir) {
      const config = getConfig();
      const baseUrl = opts && opts.url || config.url;
      if (config.userId) {
        console.log(JSON.stringify({
          status: "already_authorized",
          userId: config.userId,
          message: `\u5DF2\u7ED1\u5B9A userId: ${config.userId}\uFF0C\u5982\u9700\u91CD\u65B0\u6388\u6743\u8BF7\u5148\u5220\u9664 .env \u4E2D\u7684 MIND_MAP_USER_ID`
        }, null, 2));
        return { success: true, alreadyAuthorized: true, userId: config.userId };
      }
      console.error("[Auth] \u6B63\u5728\u751F\u6210\u6388\u6743\u7801...");
      const codeResult = await apiRequest("POST", "/api/mind-map/auth/code", null, { url: baseUrl });
      if (!codeResult.code) {
        return {
          success: false,
          error: "\u751F\u6210\u6388\u6743\u7801\u5931\u8D25",
          message: codeResult.error || codeResult.message || "\u670D\u52A1\u5668\u672A\u8FD4\u56DE\u6388\u6743\u7801"
        };
      }
      const code = codeResult.code;
      const authUrl = `${baseUrl}/#/auth?code=${code}`;
      console.error(`[Auth] \u6388\u6743\u7801: ${code}`);
      console.error(`[Auth] \u8BF7\u5728\u6D4F\u89C8\u5668\u4E2D\u786E\u8BA4\u6388\u6743: ${authUrl}`);
      try {
        const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
        execSync(`${openCmd} "${authUrl}"`, { stdio: "ignore" });
        console.error("[Auth] \u5DF2\u6253\u5F00\u6D4F\u89C8\u5668\u6388\u6743\u9875\u9762");
      } catch (e) {
        console.error(`[Auth] \u65E0\u6CD5\u81EA\u52A8\u6253\u5F00\u6D4F\u89C8\u5668\uFF0C\u8BF7\u624B\u52A8\u8BBF\u95EE: ${authUrl}`);
      }
      const POLL_INTERVAL_MS = 2e3;
      const MAX_POLL_MS = 5 * 60 * 1e3;
      const startTime = Date.now();
      while (Date.now() - startTime < MAX_POLL_MS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        const pollResult = await apiRequest("GET", `/api/mind-map/auth/poll?code=${code}`, null, { url: baseUrl });
        if (pollResult.ready && pollResult.userId) {
          saveUserIdToEnv(baseDir, pollResult.userId);
          console.error(`[Auth] \u6388\u6743\u6210\u529F! userId: ${pollResult.userId}`);
          return {
            success: true,
            userId: pollResult.userId,
            message: `\u5DF2\u7ED1\u5B9A userId: ${pollResult.userId}\uFF0C\u5DF2\u5199\u5165 .env`
          };
        }
        if (pollResult.error && !pollResult.error.includes("\u8FC7\u671F")) {
          continue;
        }
        if (pollResult.error && pollResult.error.includes("\u8FC7\u671F")) {
          return {
            success: false,
            error: "\u6388\u6743\u7801\u5DF2\u8FC7\u671F",
            message: "\u8BF7\u5728 5 \u5206\u949F\u5185\u5B8C\u6210\u6388\u6743\u786E\u8BA4"
          };
        }
      }
      return {
        success: false,
        error: "\u6388\u6743\u8D85\u65F6",
        message: "5 \u5206\u949F\u5185\u672A\u5B8C\u6210\u6388\u6743\u786E\u8BA4"
      };
    }
    module2.exports = { cmdAuth: cmdAuth2 };
  }
});

// run.js
var { SKILL_VERSION, loadDotEnv, initTls } = require_api();
var {
  cmdStatus,
  cmdRead,
  cmdAdd,
  cmdDelete,
  cmdUpdate,
  cmdWrite,
  cmdConfig,
  cmdExec,
  cmdMove,
  cmdUp,
  cmdDown,
  cmdInsert,
  cmdInsertParent,
  cmdNote,
  cmdLink,
  cmdUndo,
  cmdRedo,
  cmdExpand,
  cmdCollapse,
  cmdSearch,
  cmdGeneralization,
  cmdAssociativeLine,
  cmdFormula,
  cmdOuterFrame
} = require_commands();
var { cmdAuth } = require_auth();
loadDotEnv(__dirname);
initTls();
function parseOptions(args, startIndex) {
  const opts = {};
  const positional = [];
  let i = startIndex;
  while (i < args.length) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        opts[key] = args[i + 1];
        i += 2;
      } else {
        opts[key] = true;
        i++;
      }
    } else {
      positional.push(args[i]);
      i++;
    }
  }
  return { opts, positional };
}
function showHelp() {
  console.log(`
\u601D\u7EF4\u5BFC\u56FE\u8FDC\u7A0B\u63A7\u5236\u5DE5\u5177 v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <command> [args] [options]

\u57FA\u7840\u547D\u4EE4:
  auth                         \u6388\u6743\u7ED1\u5B9A\u6D4F\u89C8\u5668
  status                       \u68C0\u67E5\u6D4F\u89C8\u5668\u8FDE\u63A5\u72B6\u6001
  read                         \u8BFB\u53D6\u601D\u7EF4\u5BFC\u56FE
  add <text>                   \u6DFB\u52A0\u5B50\u8282\u70B9
  delete <uid>                 \u5220\u9664\u8282\u70B9
  update <uid> <text>          \u66F4\u65B0\u8282\u70B9\u6587\u672C
  write <json-file>            \u4ECE JSON \u6587\u4EF6\u8986\u76D6\u6574\u56FE
  config                       \u663E\u793A\u5F53\u524D\u914D\u7F6E

\u8282\u70B9\u64CD\u4F5C:
  move <uid> <targetUid>       \u79FB\u52A8\u8282\u70B9\u5230\u76EE\u6807\u8282\u70B9\u4E0B
  up <uid>                     \u4E0A\u79FB\u8282\u70B9\uFF08\u540C\u7EA7\u6392\u5E8F\uFF09
  down <uid>                   \u4E0B\u79FB\u8282\u70B9\uFF08\u540C\u7EA7\u6392\u5E8F\uFF09
  insert <uid> <text>          \u5728\u6307\u5B9A\u8282\u70B9\u65C1\u63D2\u5165\u540C\u7EA7\u8282\u70B9
  insert-parent <uid> <text>   \u5728\u6307\u5B9A\u8282\u70B9\u4E0A\u65B9\u63D2\u5165\u7236\u7EA7\u8282\u70B9

\u8282\u70B9\u5C5E\u6027:
  note <uid> <text>            \u8BBE\u7F6E\u8282\u70B9\u5907\u6CE8\uFF08\u7A7A\u5B57\u7B26\u4E32\u6E05\u9664\uFF09
  link <uid> <url>             \u8BBE\u7F6E\u8282\u70B9\u8D85\u94FE\u63A5\uFF08\u7A7A\u5B57\u7B26\u4E32\u6E05\u9664\uFF09

\u5386\u53F2\u64CD\u4F5C:
  undo                         \u64A4\u9500\u4E0A\u4E00\u6B65\u64CD\u4F5C
  redo                         \u91CD\u505A

\u89C6\u56FE\u63A7\u5236:
  expand [uid]                 \u5C55\u5F00\u6307\u5B9A\u8282\u70B9\uFF08\u65E0 uid \u5219\u5C55\u5F00\u5168\u90E8\uFF09
  collapse [uid]               \u6536\u8D77\u6307\u5B9A\u8282\u70B9\uFF08\u65E0 uid \u5219\u6536\u8D77\u5168\u90E8\uFF09
  search <keyword>             \u6309\u5173\u952E\u8BCD\u641C\u7D22\u8282\u70B9

\u9AD8\u7EA7:
  exec <command> [args-json]   \u6267\u884C\u4EFB\u610F simple-mind-map execCommand

\u6982\u8981/\u5173\u8054\u7EBF/\u516C\u5F0F/\u5916\u6846:
  gen <action> <uid>           \u6982\u8981\u64CD\u4F5C (add/list/update/delete)
  line <action>                \u5173\u8054\u7EBF\u64CD\u4F5C (add/list/update/delete)
  formula <action> <uid>       \u516C\u5F0F\u64CD\u4F5C (add/list/update/delete)
  frame <action>               \u5916\u6846\u64CD\u4F5C (add/list/update/delete)

\u5168\u5C40\u9009\u9879:
  --format <tree|json|summary>  \u8BFB\u53D6\u683C\u5F0F\uFF08read \u547D\u4EE4\uFF0C\u9ED8\u8BA4 tree\uFF09
  --parent <uid>                \u7236\u8282\u70B9 UID\uFF08add \u547D\u4EE4\uFF0C\u9ED8\u8BA4\u6839\u8282\u70B9\uFF09
  --title <t>                   \u94FE\u63A5\u6807\u9898\uFF08link \u547D\u4EE4\uFF09
  --step <n>                    \u64A4\u9500/\u91CD\u505A\u6B65\u6570\uFF08\u9ED8\u8BA4 1\uFF09
  --url <url>                   \u8986\u76D6 API \u670D\u52A1\u5668\u5730\u5740
  --token <t>                   \u8986\u76D6 API Token
  -h, --help                    \u663E\u793A\u5E2E\u52A9
  -v, --version                 \u663E\u793A\u7248\u672C

\u793A\u4F8B:
  node skill.js status
  node skill.js read
  node skill.js read --format summary
  node skill.js add "\u65B0\u60F3\u6CD5"
  node skill.js add "\u5B50\u9879" --parent abc123
  node skill.js update abc123 "\u4FEE\u6539\u540E\u7684\u6587\u672C"
  node skill.js delete abc123
  node skill.js move abc123 def456
  node skill.js up abc123
  node skill.js insert abc123 "\u540C\u7EA7\u65B0\u8282\u70B9"
  node skill.js note abc123 "\u8FD9\u662F\u5907\u6CE8\u5185\u5BB9"
  node skill.js link abc123 "https://example.com"
  node skill.js undo
  node skill.js expand abc123
  node skill.js collapse
  node skill.js search "\u5173\u952E\u8BCD"
  node skill.js exec SET_NODE_TAG '{"uid":"abc123","tag":["\u91CD\u8981"]}'
  node skill.js gen add abc123 "\u8FD9\u662F\u6982\u8981" --range '[0,2]'
  node skill.js gen list abc123
  node skill.js line add --fromUid abc123 --toUid def456
  node skill.js line list
  node skill.js formula add abc123 "E=mc^2"
  node skill.js formula list abc123
  node skill.js frame add --uids '["abc123","def456"]'
  node skill.js frame list

\u73AF\u5883\u53D8\u91CF:
  MIND_MAP_URL                  API \u670D\u52A1\u5668\u5730\u5740\uFF08\u9ED8\u8BA4 http://localhost:8086\uFF09
  MIND_MAP_API_TOKEN            API Token\uFF08\u53EF\u9009\uFF09
  MIND_MAP_USER_ID              \u6388\u6743\u7ED1\u5B9A\u7684\u7528\u6237 ID\uFF08\u901A\u8FC7 auth \u547D\u4EE4\u83B7\u53D6\uFF09
  MIND_MAP_REJECT_UNAUTHORIZED  HTTPS \u8BC1\u4E66\u9A8C\u8BC1\uFF08\u9ED8\u8BA4 false\uFF09
`);
}
var COMMANDS = {
  auth: { handler: (opts) => cmdAuth(opts, __dirname), args: [], req: [] },
  status: { handler: (opts) => cmdStatus(opts), args: [], req: [] },
  read: { handler: (opts) => cmdRead(opts), args: [], req: [] },
  add: { handler: (opts, pos) => cmdAdd(pos[0], opts), args: ["text"], req: ["\u8282\u70B9\u6587\u672C"] },
  delete: { handler: (opts, pos) => cmdDelete(pos[0], opts), args: ["uid"], req: ["\u8282\u70B9 UID"] },
  update: { handler: (opts, pos) => cmdUpdate(pos[0], pos[1], opts), args: ["uid", "text"], req: ["\u8282\u70B9 UID", "\u65B0\u6587\u672C"] },
  write: { handler: (opts, pos) => cmdWrite(pos[0], opts), args: ["json-file"], req: ["JSON \u6587\u4EF6\u8DEF\u5F84"] },
  config: { handler: () => cmdConfig(), args: [], req: [] },
  // 高级命令
  move: { handler: (opts, pos) => cmdMove(pos[0], pos[1], opts), args: ["uid", "targetUid"], req: ["\u8282\u70B9 UID", "\u76EE\u6807\u8282\u70B9 UID"] },
  up: { handler: (opts, pos) => cmdUp(pos[0], opts), args: ["uid"], req: ["\u8282\u70B9 UID"] },
  down: { handler: (opts, pos) => cmdDown(pos[0], opts), args: ["uid"], req: ["\u8282\u70B9 UID"] },
  insert: { handler: (opts, pos) => cmdInsert(pos[0], pos[1], opts), args: ["uid", "text"], req: ["\u53C2\u8003\u8282\u70B9 UID", "\u65B0\u8282\u70B9\u6587\u672C"] },
  "insert-parent": { handler: (opts, pos) => cmdInsertParent(pos[0], pos[1], opts), args: ["uid", "text"], req: ["\u5B50\u8282\u70B9 UID", "\u65B0\u7236\u8282\u70B9\u6587\u672C"] },
  note: { handler: (opts, pos) => cmdNote(pos[0], pos[1], opts), args: ["uid", "note"], req: ["\u8282\u70B9 UID", "\u5907\u6CE8\u6587\u672C"] },
  link: { handler: (opts, pos) => cmdLink(pos[0], pos[1], opts), args: ["uid", "url"], req: ["\u8282\u70B9 UID", "URL"] },
  undo: { handler: (opts) => cmdUndo(opts), args: [], req: [] },
  redo: { handler: (opts) => cmdRedo(opts), args: [], req: [] },
  expand: { handler: (opts, pos) => cmdExpand(pos[0] || null, opts), args: [], req: [] },
  collapse: { handler: (opts, pos) => cmdCollapse(pos[0] || null, opts), args: [], req: [] },
  search: { handler: (opts, pos) => cmdSearch(pos[0], opts), args: ["keyword"], req: ["\u641C\u7D22\u5173\u952E\u8BCD"] },
  exec: { handler: (opts, pos) => cmdExec(pos[0], pos[1], opts), args: ["command"], req: ["\u547D\u4EE4\u540D"] },
  // 概要/关联线/公式/外框
  gen: { handler: (opts, pos) => cmdGeneralization(pos[0], pos[1], opts), args: ["action", "uid"], req: ["\u64CD\u4F5C\u7C7B\u578B", "\u8282\u70B9 UID"] },
  line: { handler: (opts, pos) => cmdAssociativeLine(pos[0], opts), args: ["action"], req: ["\u64CD\u4F5C\u7C7B\u578B"] },
  formula: { handler: (opts, pos) => cmdFormula(pos[0], pos[1], opts), args: ["action", "uid"], req: ["\u64CD\u4F5C\u7C7B\u578B", "\u8282\u70B9 UID"] },
  frame: { handler: (opts, pos) => cmdOuterFrame(pos[0], opts), args: ["action"], req: ["\u64CD\u4F5C\u7C7B\u578B"] }
};
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    showHelp();
    return;
  }
  if (args[0] === "-v" || args[0] === "--version") {
    console.log(`\u601D\u7EF4\u5BFC\u56FE\u8FDC\u7A0B\u63A7\u5236\u5DE5\u5177 v${SKILL_VERSION}`);
    return;
  }
  const command = args[0];
  const { opts, positional } = parseOptions(args, 1);
  const cmd = COMMANDS[command];
  if (!cmd) {
    console.log(JSON.stringify({ error: "\u672A\u77E5\u547D\u4EE4", message: `\u4E0D\u652F\u6301\u547D\u4EE4: ${command}\uFF0C\u4F7F\u7528 --help \u67E5\u770B\u5E2E\u52A9` }, null, 2));
    return;
  }
  for (let i = 0; i < cmd.args.length; i++) {
    if (!positional[i]) {
      console.log(JSON.stringify({ error: "\u53C2\u6570\u9519\u8BEF", message: `${command} \u547D\u4EE4\u9700\u8981${cmd.req[i]}\u53C2\u6570` }, null, 2));
      return;
    }
  }
  const overrides = {};
  if (opts.url) overrides.url = opts.url;
  if (opts.token) overrides.token = opts.token;
  const mergedOpts = { ...opts, ...overrides };
  const result = cmd.handler(mergedOpts, positional);
  console.log(JSON.stringify(await result, null, 2));
}
main().catch((err) => {
  console.error(JSON.stringify({ error: "\u7A0B\u5E8F\u9519\u8BEF", message: err.message }));
  process.exit(1);
});
