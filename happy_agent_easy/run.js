#!/usr/bin/env node
/**
 * Happy Agent Easy - 简化的 Happy Agent 客户端
 *
 * 用法:
 *   node skill.js list [--active]
 *   node skill.js status <session-id>
 *   node skill.js history <session-id> [--limit 10]
 *   node skill.js create --path <path> [--tag <name>]
 *   node skill.js send <session-id> <message>
 *   node skill.js wait <session-id> [--timeout 60000]
 *
 * 作者: Claude Code
 * 版本: 0.1.0
 */

const { execSync, spawn } = require("child_process");

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "0.1.0-dev";

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0];

// 显示帮助
function showHelp() {
  console.log(`
Happy Agent Easy v${SKILL_VERSION}
简化的 Happy Agent 客户端，优化输出格式以减少 token 消耗

用法:
  node skill.js <command> [options]

命令:
  list [--active]              列出所有会话（--active 仅显示活跃会话）
  status <session-id>          获取会话详细状态
  history <session-id> [limit] 查看会话历史（默认10条）
  send <session-id> <message>  发送消息到会话
  wait <session-id> [--timeout <ms>]   等待会话空闲

选项:
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息

示例:
  node skill.js list
  node skill.js list --active
  node skill.js status cmmlfb1d716gwo414t04qqrhz
  node skill.js history cmmlfb1d716gwo414t04qqrhz 20
  node skill.js send cmmlfb1d716gwo414t04qqrhz "你好"
  node skill.js wait cmmlfb1d716gwo414t04qqrhz --timeout 30000
`);
}

// 显示版本
function showVersion() {
  console.log(`Happy Agent Easy v${SKILL_VERSION}`);
}

// 检查 happy-agent 是否可用
function checkHappyAgent() {
  try {
    execSync("which happy-agent", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

// 执行 happy-agent 命令并获取 JSON 输出
function runHappyAgent(args) {
  try {
    const result = execSync(`happy-agent ${args} --json`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 50 * 1024 * 1024 // 50MB
    });
    return JSON.parse(result);
  } catch (error) {
    if (error.status === 1 && error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        // 尝试非 JSON 输出
        return error.stdout || error.stderr;
      }
    }
    throw error;
  }
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString("zh-CN");
}

// 格式化时间戳
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN");
}

// 生成语义化的会话标识
function formatSessionLabel(s) {
  const host = s.metadata?.host || "unknown";
  const name = s.metadata?.name || "-";
  const id = s.id;

  // 简化主机名（取第一部分）
  const shortHost = host.split(".")[0] || host;

  // 名称处理：如果有名称则使用，否则用路径最后部分
  let label = name;
  if (!label || label === "-") {
    const path = s.metadata?.path || "";
    const parts = path.split("/").filter(p => p);
    label = parts.length > 0 ? parts[parts.length - 1] : "unnamed";
  }

  return `${shortHost}-${label}-${id}`;
}

// list 命令处理
function handleList(showActiveOnly) {
  console.log("\n" + "=".repeat(60));
  console.log("📋 Happy Agent 会话列表");
  console.log("=".repeat(60) + "\n");

  const sessions = runHappyAgent("list");

  if (!Array.isArray(sessions)) {
    console.log("无法获取会话列表");
    return;
  }

  const activeSessions = sessions.filter(s => s.active);
  const inactiveSessions = sessions.filter(s => !s.active);

  console.log(`会话总数: ${sessions.length} | 活跃: ${activeSessions.length}\n`);

  if (showActiveOnly) {
    // 仅显示活跃会话
    console.log("活跃会话:\n");
    activeSessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${formatSessionLabel(s)}`);
      console.log(`     状态: 🟢 active | 最后活跃: ${formatTime(s.activeAt || s.updatedAt)}\n`);
    });
  } else {
    // 显示活跃会话
    if (activeSessions.length > 0) {
      console.log("活跃会话:\n");
      activeSessions.slice(0, 5).forEach((s, i) => {
        console.log(`  ${i + 1}. ${formatSessionLabel(s)}`);
        console.log(`     状态: 🟢 active | 最后活跃: ${formatTime(s.activeAt || s.updatedAt)}\n`);
      });
      if (activeSessions.length > 5) {
        console.log(`  ... 还有 ${activeSessions.length - 5} 个活跃会话\n`);
      }
    }

    // 显示最近的非活跃会话
    const recentInactive = inactiveSessions
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 5);

    if (recentInactive.length > 0) {
      console.log("最近非活跃会话:\n");
      recentInactive.forEach((s, i) => {
        console.log(`  ${activeSessions.length + i + 1}. ${formatSessionLabel(s)}`);
        console.log(`     状态: ⚪ inactive | 最后活跃: ${formatTime(s.updatedAt)}\n`);
      });
    }
  }

  console.log("=".repeat(60));
}

// status 命令处理
function handleStatus(sessionId) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 会话状态");
  console.log("=".repeat(60) + "\n");

  const status = runHappyAgent(`status ${sessionId}`);

  if (!status || typeof status !== "object") {
    console.log("无法获取会话状态");
    return;
  }

  // 基本信息
  console.log(`会话 ID: ${status.id}`);
  console.log(`状态: ${status.active ? "🟢 active" : "⚪ inactive"} | ${status.metadata?.lifecycleState || "-"}`);
  console.log(`名称: ${status.metadata?.name || "-"}`);
  console.log(`路径: ${status.metadata?.path || "-"}`);
  console.log(`主机: ${status.metadata?.host || "-"}`);
  console.log(`版本: ${status.metadata?.version || "-"}`);

  // 环境信息
  console.log("\n环境信息:");
  console.log(`  - OS: ${status.metadata?.os || "-"}`);
  console.log(`  - PID: ${status.metadata?.hostPid || "-"}`);
  console.log(`  - 启动方式: ${status.metadata?.startedBy || "-"}`);

  // 工具统计
  const toolCount = status.metadata?.tools?.length || 0;
  const commandCount = status.metadata?.slashCommands?.length || 0;
  console.log(`\n工具数量: ${toolCount} | 命令数量: ${commandCount}`);

  // 最近操作
  const completedRequests = status.agentState?.completedRequests || {};
  const recentOps = Object.entries(completedRequests)
    .sort((a, b) => (b[1].completedAt || 0) - (a[1].completedAt || 0))
    .slice(0, 5);

  if (recentOps.length > 0) {
    console.log("\n最近操作:");
    recentOps.forEach(([callId, op], i) => {
      const tool = op.tool || "-";
      const desc = op.arguments?.description || op.arguments?.command || "";
      const shortDesc = desc.length > 50 ? desc.substring(0, 50) + "..." : desc;
      console.log(`  ${i + 1}. [${tool}] ${shortDesc} (${op.status || "-"})`);
    });
  }

  // 待处理请求
  const pendingRequests = status.agentState?.requests || {};
  const pending = Object.keys(pendingRequests).length;
  if (pending > 0) {
    console.log(`\n待处理请求: ${pending} 个`);
  }

  console.log("\n" + "=".repeat(60));
}

// history 命令处理
function handleHistory(sessionId, limit = 10) {
  console.log("\n" + "=".repeat(60));
  console.log("📜 会话历史");
  console.log("=".repeat(60) + "\n");

  const history = runHappyAgent(`history ${sessionId} --limit ${limit}`);

  if (!Array.isArray(history)) {
    console.log("无法获取会话历史");
    return;
  }

  console.log(`会话: ${sessionId}`);
  console.log(`消息数: ${history.length}\n`);

  // 按时间正序显示
  history.reverse().forEach((msg, i) => {
    const role = msg.content?.role || "unknown";
    const data = msg.content?.content?.data || {};
    const msgType = data.type || "-";

    if (role === "agent") {
      if (msgType === "assistant") {
        const toolUses = data.message?.content?.filter(c => c.type === "tool_use") || [];
        if (toolUses.length > 0) {
          console.log(`\n[assistant] 发起工具调用:`);
          toolUses.forEach(t => {
            const input = t.input || {};
            const desc = input.description || input.command || input.url || "";
            const shortDesc = desc.length > 60 ? desc.substring(0, 60) + "..." : desc;
            console.log(`  - ${t.name}: ${shortDesc}`);
          });
        } else {
          const textContent = data.message?.content?.filter(c => c.type === "text") || [];
          if (textContent.length > 0) {
            const text = textContent[0].text || "";
            const shortText = text.length > 100 ? text.substring(0, 100) + "..." : text;
            console.log(`\n[assistant] ${shortText}`);
          }
        }
      } else if (msgType === "user") {
        const toolResults = data.message?.content?.filter(c => c.type === "tool_result") || [];
        if (toolResults.length > 0) {
          toolResults.forEach(tr => {
            const status = tr.permissions?.result || tr.is_error ? "error" : "approved";
            const contentLen = tr.content?.length || 0;
            console.log(`\n[user] 工具返回结果 (${status})`);
            console.log(`  内容长度: ${contentLen} 字符`);
          });
        } else {
          const textContent = data.message?.content?.filter(c => c.type === "text") || [];
          if (textContent.length > 0) {
            const text = textContent[0].text || "";
            const shortText = text.length > 100 ? text.substring(0, 100) + "..." : text;
            console.log(`\n[user] ${shortText}`);
          }
        }
      }
    }
  });

  console.log("\n\n" + "=".repeat(60));
}

// send 命令处理
function handleSend(sessionId, message) {
  console.log("\n" + "=".repeat(60));
  console.log("📨 发送消息");
  console.log("=".repeat(60) + "\n");

  try {
    // send 命令可能没有 JSON 输出
    execSync(`happy-agent send ${sessionId} "${message}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    console.log("消息已发送");
    console.log(`会话: ${sessionId}`);
    console.log(`内容: ${message.length > 100 ? message.substring(0, 100) + "..." : message}`);
  } catch (error) {
    console.log("发送失败:", error.message);
  }

  console.log("\n" + "=".repeat(60));
}

// wait 命令处理
function handleWait(sessionId, timeout = 60000) {
  console.log("\n" + "=".repeat(60));
  console.log("⏳ 等待会话空闲");
  console.log("=".repeat(60) + "\n");

  const startTime = Date.now();

  try {
    const result = execSync(`happy-agent wait ${sessionId} --timeout ${timeout}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: Math.ceil(timeout / 1000) + 10
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("等待完成: 会话已空闲");
    console.log(`等待时间: ${elapsed}s`);
  } catch (error) {
    if (error.signal === "SIGTERM") {
      console.log("等待超时");
    } else {
      console.log("等待失败:", error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
}

// 主程序
if (!command || command === "-h" || command === "--help") {
  showHelp();
  process.exit(0);
}

if (command === "-v" || command === "--version") {
  showVersion();
  process.exit(0);
}

// 检查 happy-agent 是否可用
if (!checkHappyAgent()) {
  console.error("\n❌ 错误: Happy Agent 不可用");
  console.error("\n原因: command not found: happy-agent");
  console.error("解决: 请确保已安装 happy-coder 并配置好环境变量");
  console.error("\n安装方法:");
  console.error("  npm install -g happy-coder");
  console.error("  # 或");
  console.error("  pnpm add -g happy-coder\n");
  process.exit(1);
}

// 处理命令
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
        console.error("错误: 请提供 session-id");
        process.exit(1);
      }
      handleStatus(sessionId);
      break;
    }
    case "history": {
      const sessionId = args[1];
      if (!sessionId) {
        console.error("错误: 请提供 session-id");
        process.exit(1);
      }
      const limit = parseInt(args[2]) || 10;
      handleHistory(sessionId, limit);
      break;
    }
    case "send": {
      const sessionId = args[1];
      const message = args[2];
      if (!sessionId || !message) {
        console.error("错误: 请提供 session-id 和消息内容");
        process.exit(1);
      }
      handleSend(sessionId, message);
      break;
    }
    case "wait": {
      const sessionId = args[1];
      const timeoutIndex = args.indexOf("--timeout");
      const timeout = timeoutIndex >= 0 ? parseInt(args[timeoutIndex + 1]) : 60000;

      if (!sessionId) {
        console.error("错误: 请提供 session-id");
        process.exit(1);
      }
      handleWait(sessionId, timeout);
      break;
    }
    default:
      console.error(`未知命令: ${command}`);
      console.error("使用 --help 查看帮助");
      process.exit(1);
  }
} catch (error) {
  console.error("\n❌ 执行错误:", error.message);
  process.exit(1);
}
