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
  list [--all] [--limit N]     列出会话（默认仅活跃，--all 显示全部，--limit 默认10）
  status <session-id>          获取会话详细状态
  history <session-id> [limit] [options]  查看会话历史
  send <session-id> <message> [options]  发送消息到会话
  wait <session-id> [--timeout <ms>]   等待会话空闲
  whoami                       获取当前会话的 session-id
  whoami                       获取当前会话的 session-id

history 选项:
  --desc          倒序显示（最新消息在前，默认）
  --asc           正序显示（最早消息在前）
  --head          从开头获取历史记录
  --tail          从结尾获取历史记录（默认）

send 选项:
  --callback <session-id>  完成后通知指定会话（附加隐藏指令）
  --wait                   发送后等待目标会话完成
  --timeout <ms>           等待超时时间（毫秒，默认300000）

选项:
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息

示例:
  node skill.js list
  node skill.js list --limit 20
  node skill.js list --all
  node skill.js whoami
  node skill.js status cmmlfb1d716gwo414t04qqrhz
  node skill.js history cmmlfb1d716gwo414t04qqrhz 20
  node skill.js history cmmlfb1d716gwo414t04qqrhz 50 --asc
  node skill.js history cmmlfb1d716gwo414t04qqrhz 100 --head --asc
  node skill.js send cmmlfb1d716gwo414t04qqrhz "你好"
  node skill.js send abc123 "完成任务X" --callback cmmlfb1d716gwo414t04qqrhz
  node skill.js send abc123 "完成任务X" --wait --timeout 60000
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
// options: { showAll: boolean, limit: number }
function handleList(options = {}) {
  const { showAll = false, limit = 10 } = options;

  const sessions = runHappyAgent("list");

  if (!Array.isArray(sessions)) {
    console.log(JSON.stringify({ error: "无法获取会话列表" }, null, 2));
    return;
  }

  // 筛选和排序
  let filteredSessions = showAll
    ? sessions.sort((a, b) => (b.activeAt || b.updatedAt || 0) - (a.activeAt || a.updatedAt || 0))
    : sessions.filter(s => s.active);

  const total = sessions.length;
  const activeCount = sessions.filter(s => s.active).length;

  // 格式化输出
  const result = filteredSessions.slice(0, limit).map(s => {
    const host = s.metadata?.host || "unknown";
    const shortHost = host.split(".")[0] || host;
    const path = s.metadata?.path || "";
    const parts = path.split("/").filter(p => p);
    const title = s.metadata?.name || (parts.length > 0 ? parts[parts.length - 1] : "-");

    return {
      host: shortHost,
      title: title,
      sessionId: s.id,
      active: s.active
    };
  });

  console.log(JSON.stringify({
    total: total,
    active: activeCount,
    showing: result.length,
    sessions: result
  }, null, 2));
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

// 提取工具调用的关键信息
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

// 格式化时间戳为 YYYY-MM-DD HH:MM:SS 格式
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// history 命令处理 - 优化版
// options: { asc: boolean, head: boolean }
function handleHistory(sessionId, limit = 10, options = {}) {
  const { asc = false, head = false } = options;

  console.log("\n" + "=".repeat(70));
  console.log("📜 会话历史");
  console.log("=".repeat(70) + "\n");

  // happy-agent 返回的历史记录是按 createdAt 正序的（最早的在前，最新的在后）
  // 数组索引：0 = 最早，末尾 = 最新
  let fetchLimit = head ? 500 : limit;
  const history = runHappyAgent(`history ${sessionId} --limit ${fetchLimit}`);

  if (!Array.isArray(history)) {
    console.log("无法获取会话历史");
    return;
  }

  // 显示排序和获取方向信息
  const orderStr = asc ? "正序（旧→新）" : "倒序（新→旧）";
  const directionStr = head ? "从开头获取" : "从结尾获取";
  console.log(`会话: ${sessionId}`);
  console.log(`总消息数: ${history.length} | 显示: ${limit} | 排序: ${orderStr} | 方向: ${directionStr}\n`);

  // 处理历史记录
  // history 数组：索引 0 是最早的，索引末尾是最新的
  let processedHistory;

  if (head) {
    // 从开头获取：取最早的记录（数组开头）
    processedHistory = history.slice(0, limit);
  } else {
    // 从结尾获取：取最新的记录（数组末尾）
    processedHistory = history.slice(-limit);
  }

  // 根据排序决定显示顺序
  if (!asc) {
    // 倒序：时间从晚到早（反转数组）
    processedHistory = processedHistory.reverse();
  }
  // 正序：时间从早到晚（默认，保持原样）

  // 显示历史记录
  processedHistory.forEach((msg) => {
    const role = msg.content?.role || "unknown";
    const createdAt = msg.createdAt;
    const timeStr = createdAt ? formatDateTime(createdAt) : "";

    if (role === "user") {
      // 用户原始输入消息 - 结构: content.content.text
      const text = msg.content?.content?.text || "";
      if (text) {
        const displayText = text.length > 500 ? text.substring(0, 500) + "..." : text;
        console.log(`\n[${timeStr}] 👤 用户:`);
        console.log(`${displayText}`);
      }
    } else if (role === "agent") {
      // Agent 消息 - 结构: content.content.data
      const data = msg.content?.content?.data || {};
      const msgType = data.type || "-";

      if (msgType === "user") {
        // Agent 侧的 user 消息（工具返回结果）
        const contents = data.message?.content || [];
        const toolResults = contents.filter(c => c.type === "tool_result");

        if (toolResults.length > 0) {
          toolResults.forEach(tr => {
            const status = tr.is_error ? "❌" : "✅";
            console.log(`  ↳ ${status} 工具执行完成`);
          });
        }
      } else if (msgType === "assistant") {
        // Agent 侧的 assistant 消息
        const contents = data.message?.content || [];
        const toolUses = contents.filter(c => c.type === "tool_use");
        const textContents = contents.filter(c => c.type === "text");

        // 显示文本内容
        if (textContents.length > 0) {
          textContents.forEach(tc => {
            const text = tc.text || "";
            const displayText = text.length > 800 ? text.substring(0, 800) + "..." : text;
            console.log(`\n[${timeStr}] 🤖 助手:`);
            console.log(`${displayText}`);
          });
        }

        // 显示工具调用 - 关键信息提取
        if (toolUses.length > 0) {
          console.log(`\n[${timeStr}] 🔧 工具调用:`);
          toolUses.forEach(t => {
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

// send 命令处理
// options: { callback: string, wait: boolean, timeout: number }
function handleSend(sessionId, message, options = {}) {
  const { callback, wait = false, timeout = 300000 } = options;

  console.log("\n" + "=".repeat(60));
  console.log("📨 发送消息");
  console.log("=".repeat(60) + "\n");

  // 构建最终消息
  let finalMessage = message;

  // 如果有回调参数，附加隐藏的回调指令
  if (callback) {
    const callbackInstruction = `

---

<!-- 回调指令（请勿删除或修改） -->
<!--
任务完成后，请使用以下命令通知发起方：

happy-agent send ${callback} "[任务完成通知] 来自会话 ${sessionId}：任务已完成。"

或者直接回复：
"任务已完成，请使用 happy-agent history ${sessionId} 查看详情"
-->`;
    finalMessage = message + callbackInstruction;
  }

  try {
    // 发送消息
    execSync(`happy-agent send ${sessionId} "${finalMessage.replace(/"/g, '\\"')}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });

    console.log("✅ 消息已发送");
    console.log(`目标会话: ${sessionId}`);
    console.log(`内容: ${message.length > 100 ? message.substring(0, 100) + "..." : message}`);

    if (callback) {
      console.log(`\n📞 回调设置: 完成后将通知 ${callback}`);
    }

    // 如果需要等待
    if (wait) {
      console.log(`\n⏳ 等待目标会话完成（超时: ${timeout / 1000}s）...`);
      const startTime = Date.now();

      try {
        execSync(`happy-agent wait ${sessionId} --timeout ${Math.ceil(timeout / 1000)}`, {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
          timeout: Math.ceil(timeout / 1000) + 10
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ 目标会话已完成（耗时: ${elapsed}s）`);

        // 如果有回调，自动发送通知
        if (callback) {
          console.log(`\n📤 自动发送完成通知到 ${callback}...`);
          const notifyMsg = `[任务完成通知] 会话 ${sessionId} 已完成任务，耗时 ${elapsed}s`;
          execSync(`happy-agent send ${callback} "${notifyMsg}"`, {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"]
          });
          console.log("✅ 通知已发送");
        }
      } catch (waitError) {
        if (waitError.signal === "SIGTERM") {
          console.log("\n⏰ 等待超时");
        } else {
          console.log("\n❌ 等待失败:", waitError.message);
        }
      }
    }
  } catch (error) {
    console.log("❌ 发送失败:", error.message);
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

// whoami 命令处理 - 获取当前会话的 session-id
function handleWhoami() {
  const currentPath = process.cwd();

  try {
    const sessions = runHappyAgent("list");

    if (!Array.isArray(sessions)) {
      console.log(JSON.stringify({ error: "无法获取会话列表" }, null, 2));
      return;
    }

    const activeSessions = sessions.filter(s => s.active);

    // 查找当前工作目录匹配的活跃会话（精确匹配或子目录匹配）
    let currentSession = sessions.find(s =>
      s.active && s.metadata?.path === currentPath
    );

    // 如果没有精确匹配，尝试查找当前目录是否是某个会话的子目录
    if (!currentSession) {
      currentSession = activeSessions.find(s => {
        const sessionPath = s.metadata?.path;
        return sessionPath && currentPath.startsWith(sessionPath);
      });
    }

    // 如果还是没有找到，尝试查找会话目录是否是当前目录的子目录（反向匹配）
    if (!currentSession) {
      currentSession = activeSessions.find(s => {
        const sessionPath = s.metadata?.path;
        return sessionPath && sessionPath.startsWith(currentPath);
      });
    }

    if (currentSession) {
      const result = {
        sessionId: currentSession.id,
        claudeSessionId: currentSession.metadata?.claudeSessionId || null,
        path: currentSession.metadata?.path || currentPath,
        host: currentSession.metadata?.host || "unknown",
        active: true
      };
      console.log(JSON.stringify(result, null, 2));
    } else if (activeSessions.length === 1) {
      // 只有一个活跃会话，直接返回
      const s = activeSessions[0];
      const result = {
        sessionId: s.id,
        claudeSessionId: s.metadata?.claudeSessionId || null,
        path: s.metadata?.path || "unknown",
        host: s.metadata?.host || "unknown",
        active: true,
        note: "仅有一个活跃会话"
      };
      console.log(JSON.stringify(result, null, 2));
    } else if (activeSessions.length > 1) {
      // 多个活跃会话，无法确定
      console.log(JSON.stringify({
        error: "无法确定当前会话",
        reason: "存在多个活跃会话且路径不匹配",
        currentPath: currentPath,
        activeSessions: activeSessions.map(s => ({
          sessionId: s.id,
          path: s.metadata?.path || "unknown"
        }))
      }, null, 2));
    } else {
      // 没有活跃会话
      console.log(JSON.stringify({
        error: "没有活跃会话",
        currentPath: currentPath
      }, null, 2));
    }
  } catch (error) {
    console.log(JSON.stringify({ error: "执行失败", message: error.message }, null, 2));
  }
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
      const showAll = args.includes("--all") || args.includes("-a");
      let limit = 10;

      // 解析 --limit 参数
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

      // 解析参数
      let limit = 10;
      const historyOptions = { asc: false, head: false };

      // 遍历参数
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
        console.error("错误: 请提供 session-id 和消息内容");
        process.exit(1);
      }

      // 解析 send 参数
      const sendOptions = { callback: null, wait: false, timeout: 300000 };

      for (let i = 3; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--callback") {
          sendOptions.callback = args[i + 1];
          i++; // 跳过下一个参数
        } else if (arg === "--wait") {
          sendOptions.wait = true;
        } else if (arg === "--timeout") {
          sendOptions.timeout = parseInt(args[i + 1]);
          i++; // 跳过下一个参数
        }
      }

      handleSend(sessionId, message, sendOptions);
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
    case "whoami": {
      handleWhoami();
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
