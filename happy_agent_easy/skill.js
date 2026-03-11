#!/usr/bin/env node
// Happy Agent Easy v260311.114030 - 包含所有依赖，无需安装


// run.js
var { execSync, spawn } = require("child_process");
var SKILL_VERSION = true ? "260311.114030" : "0.1.0-dev";
var args = process.argv.slice(2);
var command = args[0];
function showHelp() {
  console.log(`
Happy Agent Easy v${SKILL_VERSION}
\u7B80\u5316\u7684 Happy Agent \u5BA2\u6237\u7AEF\uFF0C\u4F18\u5316\u8F93\u51FA\u683C\u5F0F\u4EE5\u51CF\u5C11 token \u6D88\u8017

\u7528\u6CD5:
  node skill.js <command> [options]

\u547D\u4EE4:
  list [--all] [--limit N]     \u5217\u51FA\u4F1A\u8BDD\uFF08\u9ED8\u8BA4\u4EC5\u6D3B\u8DC3\uFF0C--all \u663E\u793A\u5168\u90E8\uFF0C--limit \u9ED8\u8BA410\uFF09
  status <session-id>          \u83B7\u53D6\u4F1A\u8BDD\u8BE6\u7EC6\u72B6\u6001
  history <session-id> [limit] [options]  \u67E5\u770B\u4F1A\u8BDD\u5386\u53F2
  send <session-id> <message> [options]  \u53D1\u9001\u6D88\u606F\u5230\u4F1A\u8BDD
  wait <session-id> [--timeout <ms>]   \u7B49\u5F85\u4F1A\u8BDD\u7A7A\u95F2

history \u9009\u9879:
  --desc          \u5012\u5E8F\u663E\u793A\uFF08\u6700\u65B0\u6D88\u606F\u5728\u524D\uFF0C\u9ED8\u8BA4\uFF09
  --asc           \u6B63\u5E8F\u663E\u793A\uFF08\u6700\u65E9\u6D88\u606F\u5728\u524D\uFF09
  --head          \u4ECE\u5F00\u5934\u83B7\u53D6\u5386\u53F2\u8BB0\u5F55
  --tail          \u4ECE\u7ED3\u5C3E\u83B7\u53D6\u5386\u53F2\u8BB0\u5F55\uFF08\u9ED8\u8BA4\uFF09

send \u9009\u9879:
  --callback <session-id>  \u5B8C\u6210\u540E\u901A\u77E5\u6307\u5B9A\u4F1A\u8BDD\uFF08\u9644\u52A0\u9690\u85CF\u6307\u4EE4\uFF09
  --wait                   \u53D1\u9001\u540E\u7B49\u5F85\u76EE\u6807\u4F1A\u8BDD\u5B8C\u6210
  --timeout <ms>           \u7B49\u5F85\u8D85\u65F6\u65F6\u95F4\uFF08\u6BEB\u79D2\uFF0C\u9ED8\u8BA4300000\uFF09

\u9009\u9879:
  -h, --help     \u663E\u793A\u6B64\u5E2E\u52A9\u4FE1\u606F
  -v, --version  \u663E\u793A\u7248\u672C\u4FE1\u606F

\u793A\u4F8B:
  node skill.js list
  node skill.js list --limit 20
  node skill.js list --all
  node skill.js status cmmlfb1d716gwo414t04qqrhz
  node skill.js history cmmlfb1d716gwo414t04qqrhz 20
  node skill.js history cmmlfb1d716gwo414t04qqrhz 50 --asc
  node skill.js history cmmlfb1d716gwo414t04qqrhz 100 --head --asc
  node skill.js send cmmlfb1d716gwo414t04qqrhz "\u4F60\u597D"
  node skill.js send abc123 "\u5B8C\u6210\u4EFB\u52A1X" --callback cmmlfb1d716gwo414t04qqrhz
  node skill.js send abc123 "\u5B8C\u6210\u4EFB\u52A1X" --wait --timeout 60000
  node skill.js wait cmmlfb1d716gwo414t04qqrhz --timeout 30000
`);
}
function showVersion() {
  console.log(`Happy Agent Easy v${SKILL_VERSION}`);
}
function checkHappyAgent() {
  try {
    execSync("which happy-agent", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}
function runHappyAgent(args2) {
  try {
    const result = execSync(`happy-agent ${args2} --json`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 50 * 1024 * 1024
      // 50MB
    });
    return JSON.parse(result);
  } catch (error) {
    if (error.status === 1 && error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        return error.stdout || error.stderr;
      }
    }
    throw error;
  }
}
function handleList(options = {}) {
  const { showAll = false, limit = 10 } = options;
  const sessions = runHappyAgent("list");
  if (!Array.isArray(sessions)) {
    console.log(JSON.stringify({ error: "\u65E0\u6CD5\u83B7\u53D6\u4F1A\u8BDD\u5217\u8868" }, null, 2));
    return;
  }
  let filteredSessions = showAll ? sessions.sort((a, b) => (b.activeAt || b.updatedAt || 0) - (a.activeAt || a.updatedAt || 0)) : sessions.filter((s) => s.active);
  const total = sessions.length;
  const activeCount = sessions.filter((s) => s.active).length;
  const result = filteredSessions.slice(0, limit).map((s) => {
    const host = s.metadata?.host || "unknown";
    const shortHost = host.split(".")[0] || host;
    const path = s.metadata?.path || "";
    const parts = path.split("/").filter((p) => p);
    const title = s.metadata?.name || (parts.length > 0 ? parts[parts.length - 1] : "-");
    return {
      host: shortHost,
      title,
      sessionId: s.id,
      active: s.active
    };
  });
  console.log(JSON.stringify({
    total,
    active: activeCount,
    showing: result.length,
    sessions: result
  }, null, 2));
}
function handleStatus(sessionId) {
  console.log("\n" + "=".repeat(60));
  console.log("\u{1F4CA} \u4F1A\u8BDD\u72B6\u6001");
  console.log("=".repeat(60) + "\n");
  const status = runHappyAgent(`status ${sessionId}`);
  if (!status || typeof status !== "object") {
    console.log("\u65E0\u6CD5\u83B7\u53D6\u4F1A\u8BDD\u72B6\u6001");
    return;
  }
  console.log(`\u4F1A\u8BDD ID: ${status.id}`);
  console.log(`\u72B6\u6001: ${status.active ? "\u{1F7E2} active" : "\u26AA inactive"} | ${status.metadata?.lifecycleState || "-"}`);
  console.log(`\u540D\u79F0: ${status.metadata?.name || "-"}`);
  console.log(`\u8DEF\u5F84: ${status.metadata?.path || "-"}`);
  console.log(`\u4E3B\u673A: ${status.metadata?.host || "-"}`);
  console.log(`\u7248\u672C: ${status.metadata?.version || "-"}`);
  console.log("\n\u73AF\u5883\u4FE1\u606F:");
  console.log(`  - OS: ${status.metadata?.os || "-"}`);
  console.log(`  - PID: ${status.metadata?.hostPid || "-"}`);
  console.log(`  - \u542F\u52A8\u65B9\u5F0F: ${status.metadata?.startedBy || "-"}`);
  const toolCount = status.metadata?.tools?.length || 0;
  const commandCount = status.metadata?.slashCommands?.length || 0;
  console.log(`
\u5DE5\u5177\u6570\u91CF: ${toolCount} | \u547D\u4EE4\u6570\u91CF: ${commandCount}`);
  const completedRequests = status.agentState?.completedRequests || {};
  const recentOps = Object.entries(completedRequests).sort((a, b) => (b[1].completedAt || 0) - (a[1].completedAt || 0)).slice(0, 5);
  if (recentOps.length > 0) {
    console.log("\n\u6700\u8FD1\u64CD\u4F5C:");
    recentOps.forEach(([callId, op], i) => {
      const tool = op.tool || "-";
      const desc = op.arguments?.description || op.arguments?.command || "";
      const shortDesc = desc.length > 50 ? desc.substring(0, 50) + "..." : desc;
      console.log(`  ${i + 1}. [${tool}] ${shortDesc} (${op.status || "-"})`);
    });
  }
  const pendingRequests = status.agentState?.requests || {};
  const pending = Object.keys(pendingRequests).length;
  if (pending > 0) {
    console.log(`
\u5F85\u5904\u7406\u8BF7\u6C42: ${pending} \u4E2A`);
  }
  console.log("\n" + "=".repeat(60));
}
function extractToolInfo(toolName, input) {
  switch (toolName) {
    case "Read":
    case "Edit":
    case "Write":
      return input.file_path || input.path || "";
    case "Bash":
      return input.description || input.command?.substring(0, 50) || "";
    case "Glob":
      return input.pattern || "";
    case "Grep":
      return input.pattern || "";
    default:
      return input.description || input.url || input.path || "";
  }
}
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
function handleHistory(sessionId, limit = 10, options = {}) {
  const { asc = false, head = false } = options;
  console.log("\n" + "=".repeat(70));
  console.log("\u{1F4DC} \u4F1A\u8BDD\u5386\u53F2");
  console.log("=".repeat(70) + "\n");
  let fetchLimit = head ? 500 : limit;
  const history = runHappyAgent(`history ${sessionId} --limit ${fetchLimit}`);
  if (!Array.isArray(history)) {
    console.log("\u65E0\u6CD5\u83B7\u53D6\u4F1A\u8BDD\u5386\u53F2");
    return;
  }
  const orderStr = asc ? "\u6B63\u5E8F\uFF08\u65E7\u2192\u65B0\uFF09" : "\u5012\u5E8F\uFF08\u65B0\u2192\u65E7\uFF09";
  const directionStr = head ? "\u4ECE\u5F00\u5934\u83B7\u53D6" : "\u4ECE\u7ED3\u5C3E\u83B7\u53D6";
  console.log(`\u4F1A\u8BDD: ${sessionId}`);
  console.log(`\u603B\u6D88\u606F\u6570: ${history.length} | \u663E\u793A: ${limit} | \u6392\u5E8F: ${orderStr} | \u65B9\u5411: ${directionStr}
`);
  let processedHistory;
  if (head) {
    processedHistory = history.slice(0, limit);
  } else {
    processedHistory = history.slice(-limit);
  }
  if (!asc) {
    processedHistory = processedHistory.reverse();
  }
  processedHistory.forEach((msg) => {
    const role = msg.content?.role || "unknown";
    const createdAt = msg.createdAt;
    const timeStr = createdAt ? formatDateTime(createdAt) : "";
    if (role === "user") {
      const text = msg.content?.content?.text || "";
      if (text) {
        const displayText = text.length > 500 ? text.substring(0, 500) + "..." : text;
        console.log(`
[${timeStr}] \u{1F464} \u7528\u6237:`);
        console.log(`${displayText}`);
      }
    } else if (role === "agent") {
      const data = msg.content?.content?.data || {};
      const msgType = data.type || "-";
      if (msgType === "user") {
        const contents = data.message?.content || [];
        const toolResults = contents.filter((c) => c.type === "tool_result");
        if (toolResults.length > 0) {
          toolResults.forEach((tr) => {
            const status = tr.is_error ? "\u274C" : "\u2705";
            console.log(`  \u21B3 ${status} \u5DE5\u5177\u6267\u884C\u5B8C\u6210`);
          });
        }
      } else if (msgType === "assistant") {
        const contents = data.message?.content || [];
        const toolUses = contents.filter((c) => c.type === "tool_use");
        const textContents = contents.filter((c) => c.type === "text");
        if (textContents.length > 0) {
          textContents.forEach((tc) => {
            const text = tc.text || "";
            const displayText = text.length > 800 ? text.substring(0, 800) + "..." : text;
            console.log(`
[${timeStr}] \u{1F916} \u52A9\u624B:`);
            console.log(`${displayText}`);
          });
        }
        if (toolUses.length > 0) {
          console.log(`
[${timeStr}] \u{1F527} \u5DE5\u5177\u8C03\u7528:`);
          toolUses.forEach((t) => {
            const info = extractToolInfo(t.name, t.input || {});
            const shortInfo = info.length > 60 ? info.substring(0, 60) + "..." : info;
            console.log(`  - ${t.name}: ${shortInfo || "-"}`);
          });
        }
      }
    }
  });
  console.log("\n\n" + "=".repeat(70));
}
function handleSend(sessionId, message, options = {}) {
  const { callback, wait = false, timeout = 3e5 } = options;
  console.log("\n" + "=".repeat(60));
  console.log("\u{1F4E8} \u53D1\u9001\u6D88\u606F");
  console.log("=".repeat(60) + "\n");
  let finalMessage = message;
  if (callback) {
    const callbackInstruction = `

---

<!-- \u56DE\u8C03\u6307\u4EE4\uFF08\u8BF7\u52FF\u5220\u9664\u6216\u4FEE\u6539\uFF09 -->
<!--
\u4EFB\u52A1\u5B8C\u6210\u540E\uFF0C\u8BF7\u4F7F\u7528\u4EE5\u4E0B\u547D\u4EE4\u901A\u77E5\u53D1\u8D77\u65B9\uFF1A

happy-agent send ${callback} "[\u4EFB\u52A1\u5B8C\u6210\u901A\u77E5] \u6765\u81EA\u4F1A\u8BDD ${sessionId}\uFF1A\u4EFB\u52A1\u5DF2\u5B8C\u6210\u3002"

\u6216\u8005\u76F4\u63A5\u56DE\u590D\uFF1A
"\u4EFB\u52A1\u5DF2\u5B8C\u6210\uFF0C\u8BF7\u4F7F\u7528 happy-agent history ${sessionId} \u67E5\u770B\u8BE6\u60C5"
-->`;
    finalMessage = message + callbackInstruction;
  }
  try {
    execSync(`happy-agent send ${sessionId} "${finalMessage.replace(/"/g, '\\"')}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    console.log("\u2705 \u6D88\u606F\u5DF2\u53D1\u9001");
    console.log(`\u76EE\u6807\u4F1A\u8BDD: ${sessionId}`);
    console.log(`\u5185\u5BB9: ${message.length > 100 ? message.substring(0, 100) + "..." : message}`);
    if (callback) {
      console.log(`
\u{1F4DE} \u56DE\u8C03\u8BBE\u7F6E: \u5B8C\u6210\u540E\u5C06\u901A\u77E5 ${callback}`);
    }
    if (wait) {
      console.log(`
\u23F3 \u7B49\u5F85\u76EE\u6807\u4F1A\u8BDD\u5B8C\u6210\uFF08\u8D85\u65F6: ${timeout / 1e3}s\uFF09...`);
      const startTime = Date.now();
      try {
        execSync(`happy-agent wait ${sessionId} --timeout ${Math.ceil(timeout / 1e3)}`, {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
          timeout: Math.ceil(timeout / 1e3) + 10
        });
        const elapsed = ((Date.now() - startTime) / 1e3).toFixed(1);
        console.log(`
\u2705 \u76EE\u6807\u4F1A\u8BDD\u5DF2\u5B8C\u6210\uFF08\u8017\u65F6: ${elapsed}s\uFF09`);
        if (callback) {
          console.log(`
\u{1F4E4} \u81EA\u52A8\u53D1\u9001\u5B8C\u6210\u901A\u77E5\u5230 ${callback}...`);
          const notifyMsg = `[\u4EFB\u52A1\u5B8C\u6210\u901A\u77E5] \u4F1A\u8BDD ${sessionId} \u5DF2\u5B8C\u6210\u4EFB\u52A1\uFF0C\u8017\u65F6 ${elapsed}s`;
          execSync(`happy-agent send ${callback} "${notifyMsg}"`, {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"]
          });
          console.log("\u2705 \u901A\u77E5\u5DF2\u53D1\u9001");
        }
      } catch (waitError) {
        if (waitError.signal === "SIGTERM") {
          console.log("\n\u23F0 \u7B49\u5F85\u8D85\u65F6");
        } else {
          console.log("\n\u274C \u7B49\u5F85\u5931\u8D25:", waitError.message);
        }
      }
    }
  } catch (error) {
    console.log("\u274C \u53D1\u9001\u5931\u8D25:", error.message);
  }
  console.log("\n" + "=".repeat(60));
}
function handleWait(sessionId, timeout = 6e4) {
  console.log("\n" + "=".repeat(60));
  console.log("\u23F3 \u7B49\u5F85\u4F1A\u8BDD\u7A7A\u95F2");
  console.log("=".repeat(60) + "\n");
  const startTime = Date.now();
  try {
    const result = execSync(`happy-agent wait ${sessionId} --timeout ${timeout}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: Math.ceil(timeout / 1e3) + 10
    });
    const elapsed = ((Date.now() - startTime) / 1e3).toFixed(1);
    console.log("\u7B49\u5F85\u5B8C\u6210: \u4F1A\u8BDD\u5DF2\u7A7A\u95F2");
    console.log(`\u7B49\u5F85\u65F6\u95F4: ${elapsed}s`);
  } catch (error) {
    if (error.signal === "SIGTERM") {
      console.log("\u7B49\u5F85\u8D85\u65F6");
    } else {
      console.log("\u7B49\u5F85\u5931\u8D25:", error.message);
    }
  }
  console.log("\n" + "=".repeat(60));
}
if (!command || command === "-h" || command === "--help") {
  showHelp();
  process.exit(0);
}
if (command === "-v" || command === "--version") {
  showVersion();
  process.exit(0);
}
if (!checkHappyAgent()) {
  console.error("\n\u274C \u9519\u8BEF: Happy Agent \u4E0D\u53EF\u7528");
  console.error("\n\u539F\u56E0: command not found: happy-agent");
  console.error("\u89E3\u51B3: \u8BF7\u786E\u4FDD\u5DF2\u5B89\u88C5 happy-coder \u5E76\u914D\u7F6E\u597D\u73AF\u5883\u53D8\u91CF");
  console.error("\n\u5B89\u88C5\u65B9\u6CD5:");
  console.error("  npm install -g happy-coder");
  console.error("  # \u6216");
  console.error("  pnpm add -g happy-coder\n");
  process.exit(1);
}
try {
  switch (command) {
    case "list": {
      const showAll = args.includes("--all") || args.includes("-a");
      let limit = 10;
      const limitIndex = args.indexOf("--limit");
      if (limitIndex >= 0 && args[limitIndex + 1]) {
        limit = parseInt(args[limitIndex + 1]) || 10;
      }
      handleList({ showAll, limit });
      break;
    }
    case "status": {
      const sessionId = args[1];
      if (!sessionId) {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B session-id");
        process.exit(1);
      }
      handleStatus(sessionId);
      break;
    }
    case "history": {
      const sessionId = args[1];
      if (!sessionId) {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B session-id");
        process.exit(1);
      }
      let limit = 10;
      const historyOptions = { asc: false, head: false };
      for (let i = 2; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--asc") {
          historyOptions.asc = true;
        } else if (arg === "--desc") {
          historyOptions.asc = false;
        } else if (arg === "--head") {
          historyOptions.head = true;
        } else if (arg === "--tail") {
          historyOptions.head = false;
        } else if (!arg.startsWith("--") && !isNaN(parseInt(arg))) {
          limit = parseInt(arg);
        }
      }
      handleHistory(sessionId, limit, historyOptions);
      break;
    }
    case "send": {
      const sessionId = args[1];
      const message = args[2];
      if (!sessionId || !message) {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B session-id \u548C\u6D88\u606F\u5185\u5BB9");
        process.exit(1);
      }
      const sendOptions = { callback: null, wait: false, timeout: 3e5 };
      for (let i = 3; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--callback") {
          sendOptions.callback = args[i + 1];
          i++;
        } else if (arg === "--wait") {
          sendOptions.wait = true;
        } else if (arg === "--timeout") {
          sendOptions.timeout = parseInt(args[i + 1]);
          i++;
        }
      }
      handleSend(sessionId, message, sendOptions);
      break;
    }
    case "wait": {
      const sessionId = args[1];
      const timeoutIndex = args.indexOf("--timeout");
      const timeout = timeoutIndex >= 0 ? parseInt(args[timeoutIndex + 1]) : 6e4;
      if (!sessionId) {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B session-id");
        process.exit(1);
      }
      handleWait(sessionId, timeout);
      break;
    }
    default:
      console.error(`\u672A\u77E5\u547D\u4EE4: ${command}`);
      console.error("\u4F7F\u7528 --help \u67E5\u770B\u5E2E\u52A9");
      process.exit(1);
  }
} catch (error) {
  console.error("\n\u274C \u6267\u884C\u9519\u8BEF:", error.message);
  process.exit(1);
}
