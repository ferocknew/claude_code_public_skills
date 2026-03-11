#!/usr/bin/env node
// Happy Agent Easy v260311.104403 - 包含所有依赖，无需安装


// run.js
var { execSync, spawn } = require("child_process");
var SKILL_VERSION = true ? "260311.104403" : "0.1.0-dev";
var args = process.argv.slice(2);
var command = args[0];
function showHelp() {
  console.log(`
Happy Agent Easy v${SKILL_VERSION}
\u7B80\u5316\u7684 Happy Agent \u5BA2\u6237\u7AEF\uFF0C\u4F18\u5316\u8F93\u51FA\u683C\u5F0F\u4EE5\u51CF\u5C11 token \u6D88\u8017

\u7528\u6CD5:
  node skill.js <command> [options]

\u547D\u4EE4:
  list [--active]              \u5217\u51FA\u6240\u6709\u4F1A\u8BDD\uFF08--active \u4EC5\u663E\u793A\u6D3B\u8DC3\u4F1A\u8BDD\uFF09
  status <session-id>          \u83B7\u53D6\u4F1A\u8BDD\u8BE6\u7EC6\u72B6\u6001
  history <session-id> [limit] \u67E5\u770B\u4F1A\u8BDD\u5386\u53F2\uFF08\u9ED8\u8BA410\u6761\uFF09
  create --path <path> [--tag <name>]  \u521B\u5EFA\u65B0\u4F1A\u8BDD
  send <session-id> <message>  \u53D1\u9001\u6D88\u606F\u5230\u4F1A\u8BDD
  wait <session-id> [--timeout <ms>]   \u7B49\u5F85\u4F1A\u8BDD\u7A7A\u95F2

\u9009\u9879:
  -h, --help     \u663E\u793A\u6B64\u5E2E\u52A9\u4FE1\u606F
  -v, --version  \u663E\u793A\u7248\u672C\u4FE1\u606F

\u793A\u4F8B:
  node skill.js list
  node skill.js list --active
  node skill.js status cmmlfb1d716gwo414t04qqrhz
  node skill.js history cmmlfb1d716gwo414t04qqrhz 20
  node skill.js create --path /data --tag "\u65B0\u4F1A\u8BDD"
  node skill.js send cmmlfb1d716gwo414t04qqrhz "\u4F60\u597D"
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
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = /* @__PURE__ */ new Date();
  const diff = now - date;
  if (diff < 6e4) return "just now";
  if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
  if (diff < 864e5) return `${Math.floor(diff / 36e5)}h ago`;
  if (diff < 6048e5) return `${Math.floor(diff / 864e5)}d ago`;
  return date.toLocaleDateString("zh-CN");
}
function handleList(showActiveOnly) {
  console.log("\n" + "=".repeat(60));
  console.log("\u{1F4CB} Happy Agent \u4F1A\u8BDD\u5217\u8868");
  console.log("=".repeat(60) + "\n");
  const sessions = runHappyAgent("list");
  if (!Array.isArray(sessions)) {
    console.log("\u65E0\u6CD5\u83B7\u53D6\u4F1A\u8BDD\u5217\u8868");
    return;
  }
  const activeSessions = sessions.filter((s) => s.active);
  const inactiveSessions = sessions.filter((s) => !s.active);
  console.log(`\u4F1A\u8BDD\u603B\u6570: ${sessions.length} | \u6D3B\u8DC3: ${activeSessions.length}
`);
  if (showActiveOnly) {
    console.log("\u6D3B\u8DC3\u4F1A\u8BDD:\n");
    activeSessions.forEach((s, i) => {
      console.log(`  ${i + 1}. [active] ${s.id}`);
      console.log(`     \u8DEF\u5F84: ${s.metadata?.path || "-"}`);
      console.log(`     \u540D\u79F0: ${s.metadata?.name || "-"}`);
      console.log(`     \u6700\u540E\u6D3B\u8DC3: ${formatTime(s.activeAt || s.updatedAt)}
`);
    });
  } else {
    if (activeSessions.length > 0) {
      console.log("\u6D3B\u8DC3\u4F1A\u8BDD:\n");
      activeSessions.slice(0, 5).forEach((s, i) => {
        console.log(`  ${i + 1}. [active] ${s.id}`);
        console.log(`     \u8DEF\u5F84: ${s.metadata?.path || "-"}`);
        console.log(`     \u540D\u79F0: ${s.metadata?.name || "-"}`);
        console.log(`     \u6700\u540E\u6D3B\u8DC3: ${formatTime(s.activeAt || s.updatedAt)}
`);
      });
      if (activeSessions.length > 5) {
        console.log(`  ... \u8FD8\u6709 ${activeSessions.length - 5} \u4E2A\u6D3B\u8DC3\u4F1A\u8BDD
`);
      }
    }
    const recentInactive = inactiveSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 5);
    if (recentInactive.length > 0) {
      console.log("\u6700\u8FD1\u975E\u6D3B\u8DC3\u4F1A\u8BDD:\n");
      recentInactive.forEach((s, i) => {
        console.log(`  ${activeSessions.length + i + 1}. [inactive] ${s.id}`);
        console.log(`     \u8DEF\u5F84: ${s.metadata?.path || "-"}`);
        console.log(`     \u540D\u79F0: ${s.metadata?.name || "-"}`);
        console.log(`     \u6700\u540E\u6D3B\u8DC3: ${formatTime(s.updatedAt)}
`);
      });
    }
  }
  console.log("=".repeat(60));
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
function handleHistory(sessionId, limit = 10) {
  console.log("\n" + "=".repeat(60));
  console.log("\u{1F4DC} \u4F1A\u8BDD\u5386\u53F2");
  console.log("=".repeat(60) + "\n");
  const history = runHappyAgent(`history ${sessionId} --limit ${limit}`);
  if (!Array.isArray(history)) {
    console.log("\u65E0\u6CD5\u83B7\u53D6\u4F1A\u8BDD\u5386\u53F2");
    return;
  }
  console.log(`\u4F1A\u8BDD: ${sessionId}`);
  console.log(`\u6D88\u606F\u6570: ${history.length}
`);
  history.reverse().forEach((msg, i) => {
    const role = msg.content?.role || "unknown";
    const data = msg.content?.content?.data || {};
    const msgType = data.type || "-";
    if (role === "agent") {
      if (msgType === "assistant") {
        const toolUses = data.message?.content?.filter((c) => c.type === "tool_use") || [];
        if (toolUses.length > 0) {
          console.log(`
[assistant] \u53D1\u8D77\u5DE5\u5177\u8C03\u7528:`);
          toolUses.forEach((t) => {
            const input = t.input || {};
            const desc = input.description || input.command || input.url || "";
            const shortDesc = desc.length > 60 ? desc.substring(0, 60) + "..." : desc;
            console.log(`  - ${t.name}: ${shortDesc}`);
          });
        } else {
          const textContent = data.message?.content?.filter((c) => c.type === "text") || [];
          if (textContent.length > 0) {
            const text = textContent[0].text || "";
            const shortText = text.length > 100 ? text.substring(0, 100) + "..." : text;
            console.log(`
[assistant] ${shortText}`);
          }
        }
      } else if (msgType === "user") {
        const toolResults = data.message?.content?.filter((c) => c.type === "tool_result") || [];
        if (toolResults.length > 0) {
          toolResults.forEach((tr) => {
            const status = tr.permissions?.result || tr.is_error ? "error" : "approved";
            const contentLen = tr.content?.length || 0;
            console.log(`
[user] \u5DE5\u5177\u8FD4\u56DE\u7ED3\u679C (${status})`);
            console.log(`  \u5185\u5BB9\u957F\u5EA6: ${contentLen} \u5B57\u7B26`);
          });
        } else {
          const textContent = data.message?.content?.filter((c) => c.type === "text") || [];
          if (textContent.length > 0) {
            const text = textContent[0].text || "";
            const shortText = text.length > 100 ? text.substring(0, 100) + "..." : text;
            console.log(`
[user] ${shortText}`);
          }
        }
      }
    }
  });
  console.log("\n\n" + "=".repeat(60));
}
function handleCreate(path, tag) {
  console.log("\n" + "=".repeat(60));
  console.log("\u{1F195} \u521B\u5EFA\u4F1A\u8BDD");
  console.log("=".repeat(60) + "\n");
  let cmd = `create --path "${path}"`;
  if (tag) {
    cmd += ` --tag "${tag}"`;
  }
  const result = runHappyAgent(cmd);
  if (result && typeof result === "object") {
    console.log("\u521B\u5EFA\u6210\u529F:");
    console.log(`  ID: ${result.id || "-"}`);
    console.log(`  \u8DEF\u5F84: ${result.metadata?.path || path}`);
    console.log(`  \u540D\u79F0: ${result.metadata?.name || tag || "-"}`);
    console.log(`  \u72B6\u6001: ${result.active ? "active" : "inactive"}`);
  } else {
    console.log("\u521B\u5EFA\u8BF7\u6C42\u5DF2\u53D1\u9001");
  }
  console.log("\n" + "=".repeat(60));
}
function handleSend(sessionId, message) {
  console.log("\n" + "=".repeat(60));
  console.log("\u{1F4E8} \u53D1\u9001\u6D88\u606F");
  console.log("=".repeat(60) + "\n");
  try {
    const result = execSync(`happy-agent send ${sessionId} "${message}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    console.log("\u6D88\u606F\u5DF2\u53D1\u9001");
    console.log(`\u4F1A\u8BDD: ${sessionId}`);
    console.log(`\u5185\u5BB9: ${message.length > 100 ? message.substring(0, 100) + "..." : message}`);
  } catch (error) {
    console.log("\u53D1\u9001\u5931\u8D25:", error.message);
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
      const showActive = args.includes("--active") || args.includes("-a");
      handleList(showActive);
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
      const limit = parseInt(args[2]) || 10;
      handleHistory(sessionId, limit);
      break;
    }
    case "create": {
      const pathIndex = args.indexOf("--path");
      const tagIndex = args.indexOf("--tag");
      const path = pathIndex >= 0 ? args[pathIndex + 1] : null;
      const tag = tagIndex >= 0 ? args[tagIndex + 1] : null;
      if (!path) {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B --path \u53C2\u6570");
        process.exit(1);
      }
      handleCreate(path, tag);
      break;
    }
    case "send": {
      const sessionId = args[1];
      const message = args[2];
      if (!sessionId || !message) {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B session-id \u548C\u6D88\u606F\u5185\u5BB9");
        process.exit(1);
      }
      handleSend(sessionId, message);
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
