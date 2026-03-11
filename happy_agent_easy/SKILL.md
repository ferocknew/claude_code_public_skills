---
name: happy_agent_easy
description: 当用户要求"查看 Happy Agent 会话"、"管理远程 Agent"、"获取会话状态"、"查看会话历史"、"发送消息到 Agent"时，或者需要与 Happy Coder Agent 进行远程交互时使用此 skill。
version: 260311.115346
---

# Happy Agent Easy - 简化的 Happy Agent 客户端

本 skill 提供对 Happy Agent CLI 的简化封装，优化输出格式以减少 token 消耗，并提供更语义化的信息供 LLM 使用。

## 重要提示

**发送消息后必须确认执行结果：**
- 使用 `send` 命令发送消息后，LLM 应等待 3～5 秒，然后使用 `history` 命令查看目标会话的回复
- 这是因为目标 Agent 需要时间处理消息并生成响应
- 示例流程：
  1. `send <session-id> "你的问题"`
  2. 等待 3～5 秒
  3. `history <session-id> 5` 查看最新回复

---

## 定时任务（CronCreate）

使用 Claude Code 内置的 `CronCreate` 工具可以创建定时任务，定期给目标会话发送消息。

### 特性

- **最小粒度**: 1 分钟（标准 cron 不支持秒级）
- **自动过期**: 3 天后自动停止
- **会话级别**: 任务仅在当前会话有效，退出 Claude 后任务消失
- **管理命令**: `CronList` 查看任务，`CronDelete` 删除任务

### Cron 表达式格式

标准 5 字段格式: `M H DoM Mon DoW`

```
分钟 小时 日 月 星期
* * * * *     每分钟
*/5 * * * *   每 5 分钟
0 * * * *     每小时整点
0 9 * * 1-5   工作日早 9 点
```

### 使用示例

```javascript
// 创建每分钟执行的定时任务
CronCreate({
  cron: "* * * * *",
  recurring: true,
  prompt: "使用 happy_agent_easy skill 给 <session-id> 发送消息：'定时检查任务'"
})

// 创建一次性任务（指定具体时间）
CronCreate({
  cron: "30 14 11 3 *",  // 3月11日 14:30
  recurring: false,
  prompt: "使用 happy_agent_easy skill 给 <session-id> 发送消息：'提醒事项'"
})

// 查看当前任务
CronList()

// 删除任务
CronDelete({ id: "任务ID" })
```

### 任务回调通知

当目标 Agent 完成任务后，需要通知发起方，有两种方式：

**方式一：使用 --callback 参数**

```bash
node skill.js send <目标session> "你的任务" --callback <你的session>
```

这会在消息中附加隐藏指令，提示对方完成后通知你。

**方式二：在消息中明确要求回复**

```bash
node skill.js send <目标session> "完成任务后请使用 happy-agent send <你的session> '任务完成' 通知我"
```

### 定时任务最佳实践

1. **避免整点执行**: 建议使用 `3 * * * *` 而非 `0 * * * *`，减少并发压力
2. **添加回调**: 在 prompt 中包含 `--callback` 或明确要求回复
3. **及时清理**: 任务完成后用 `CronDelete` 删除，避免资源浪费
4. **监控执行**: 定期用 `history` 检查目标会话是否正常响应

## 概述

Happy Agent Easy 是 Happy Coder Agent 的客户端工具，用于远程管理和监控 Agent 会话。它处理 happy-agent 命令的输出，提取关键信息并以简洁、语义化的格式呈现。

## 运行方式

**直接运行，无需安装依赖：**

```bash
# 查看所有会话（精简格式）
node skill.js list

# 仅查看活跃会话
node skill.js list --active

# 查看会话状态
node skill.js status <session-id>

# 查看会话历史（最近10条）
node skill.js history <session-id>

# 等待会话空闲
node skill.js wait <session-id>
```

---

## 命令说明

### list - 列出所有会话

```bash
node skill.js list [--active]
```

**输出格式（语义化标识）：**
```
会话总数: 133 | 活跃: 5

活跃会话:
  1. fuyingjundeMac-mini-claude_code_public_skills-cmmlfb1d716gwo414t04qqrhz
     状态: 🟢 active | 最后活跃: just now

  2. fuyingjundeMac-mini-data-cmmkiohg215b3o41435bxzsrj
     状态: 🟢 active | 最后活跃: just now

最近非活跃会话:
  6. fuyingjundeMac-mini-rust_vbscript-cmmlfatt716guo4143o9vl995
     状态: ⚪ inactive | 最后活跃: 5m ago
```

**会话标识格式**: `<主机名>-<对话名称/路径>-<session-id>`
- 主机名取完整主机名的第一部分（如 `fuyingjundeMac-mini.local` → `fuyingjundeMac-mini`）
- 对话名称优先使用会话名称，无名称则使用工作路径最后一级目录
- session-id 保持原样，方便后续操作

---

### status - 获取会话状态

```bash
node skill.js status <session-id>
```

**输出格式（精简版）：**
```
会话 ID: cmmlfb1d716gwo414t04qqrhz
状态: 🟢 active | running
名称: -
路径: /Volumes/1T_M2/Downloads/code/claude_code_public_skills
主机: fuyingjundeMac-mini.local
版本: 0.13.0

环境信息:
  - OS: darwin
  - PID: 15335
  - 启动方式: terminal

工具数量: 45 | 命令数量: 55

最近操作 (3个):
  1. [Bash] happy-agent status --json (approved)
  2. [Bash] happy-agent list --json (approved)
  3. [Bash] happy-agent history --help (approved)
```

---

### history - 查看消息历史

```bash
node skill.js history <session-id> [limit]
```

**输出格式（精简版）：**
```
会话历史 (最近10条):

[assistant] 发起工具调用:
  - Bash: happy-agent status --json

[user] 工具返回结果 (approved)
  内容长度: 2456 字符

[assistant] 发起工具调用:
  - Bash: happy-agent list --json

[user] 工具返回结果 (approved)
  内容长度: 15234 字符
```

---

### send - 发送消息

```bash
node skill.js send <session-id> "你的消息内容" [options]
```

**选项：**
- `--callback <session-id>` - 任务完成后通知指定会话（附加隐藏指令）
- `--wait` - 发送后等待目标会话完成
- `--timeout <ms>` - 等待超时时间（毫秒，默认300000）

**示例：**

```bash
# 基本发送
node skill.js send abc123 "你的消息内容"

# 发送任务并设置回调（对方完成后会通知你）
node skill.js send abc123 "完成任务X" --callback cmmlfb1d716gwo414t04qqrhz

# 发送后等待完成
node skill.js send abc123 "完成任务X" --wait --timeout 60000

# 组合使用：发送 + 回调 + 等待（等待完成后自动发送通知）
node skill.js send abc123 "完成任务X" --callback cmmlfb1d716gwo414t04qqrhz --wait
```

**回调机制说明：**

使用 `--callback` 时，会附加隐藏指令提示对方 Agent 完成后通知你：

```markdown
---

<!-- 回调指令（请勿删除或修改） -->
<!--
任务完成后，请使用以下命令通知发起方：

happy-agent send <你的session> "[任务完成通知] 来自会话 <目标session>：任务已完成。"

或者直接回复：
"任务已完成，请使用 happy-agent history <目标session> 查看详情"
-->
```

如果同时使用 `--callback` 和 `--wait`，等待完成后会**自动发送通知**到回调 session。

---

### wait - 等待会话空闲

```bash
node skill.js wait <session-id> [--timeout 60000]
```

**输出格式：**
```
等待完成: 会话已空闲
等待时间: 5.2s
```

---

## 信息提取规则

为减少 token 消耗，本工具会：

1. **语义化标识**: 会话列表使用 `<主机>-<名称>-<id>` 格式，便于 LLM 理解和引用
2. **过滤冗余字段**: 移除 createdAt、updatedAt 的原始时间戳，转为可读时间
3. **精简工具列表**: 不完整列出所有工具，仅显示数量统计
4. **压缩历史记录**: 仅提取消息类型和关键操作，不显示完整内容
5. **摘要元数据**: 合并相关信息，减少嵌套层级

---

## 与原 happy-agent 命令对比

| 功能 | happy-agent 原命令 | happy_agent_easy |
|------|-------------------|------------------|
| 列出会话 | `happy-agent list` | `node skill.js list` |
| 活跃会话 | `happy-agent list --active` | `node skill.js list --active` |
| 会话状态 | `happy-agent status <id>` | `node skill.js status <id>` |
| 会话历史 | `happy-agent history <id>` | `node skill.js history <id>` |

---

## 错误处理

当 happy-agent 命令不可用或执行失败时：

```
错误: Happy Agent 不可用
原因: command not found: happy-agent
解决: 请确保已安装 happy-coder 并配置好环境变量
```

---

## 开发说明

### 文件结构

```
happy_agent_easy/
├── SKILL.md        # 本文档
├── run.js          # 主脚本源码
├── skill.js        # 打包后的脚本（包含依赖）
├── build.js        # 打包脚本
└── package.json    # 依赖配置
```

### 构建

```bash
cd happy_agent_easy
pnpm install
npm run build
```

---

## 依赖

- Node.js >= 18.0.0
- happy-agent CLI（需已安装并可用）
