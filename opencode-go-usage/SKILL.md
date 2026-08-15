---
name: opencode-go-usage
description: 当用户要求"查询 opencode 用量"、"查询 opencode Go 余量"、"opencode 订阅剩余额度"、"opencode 使用情况"、"剩余 token 额度"时使用此 skill。通过 opencode.ai 官方页面（带 auth cookie）查询 OpenCode Go 订阅的滚动/每周/每月用量百分比与重置时间。
skill_version: 260815.134730
---

# OpenCode Go Usage

查询 OpenCode Go 订阅的用量余量。通过 opencode.ai 的 SSR 页面直接读取，实时返回**滚动用量 / 每周用量 / 每月用量**百分比与重置时间，无需执行 JS。

## 快速开始

```bash
# 查询用量
node skill.js

# 指定 workspace + 输出 JSON
node skill.js --workspace wrk_xxxxxxxx --json

# 列出账号下所有 workspace
node skill.js --list
```

## 配置

支持环境变量或本 skill 同目录下的 `.env` 文件（参考 `.env.example`，`.env` 已被 gitignore 不会提交）：

```bash
export OPENCODE_AUTH="Fe26.2**xxxx"                # 必需：浏览器 opencode.ai 的 auth cookie
export OPENCODE_WORKSPACE_ID="wrk_xxxxxxxx"        # 必需：workspace id
```

**auth cookie 获取**：浏览器登录 https://opencode.ai → F12 → Application → Cookies → opencode.ai → 复制 `auth` 的值。

请求使用 Node 原生 fetch 直连（携带完整浏览器 headers），不走系统代理；需要代理时请用 TUN/透明代理模式。

## 命令总表

| 命令 | 说明 |
|------|------|
| `node skill.js` | 查询用量（默认文本输出） |
| `node skill.js --workspace <id>` | 指定 workspace 查询 |
| `node skill.js --list` | 列出账号下所有 workspace |
| `node skill.js --json` | 输出 JSON（适合脚本/statusline） |
| `node skill.js --help` | 显示帮助 |
| `node skill.js --version` | 显示版本 |

## 选项

| 选项 | 说明 |
|------|------|
| `--workspace, -w <id>` | workspace id（也可用环境变量 `OPENCODE_WORKSPACE_ID`） |
| `--cookie <v>` | auth cookie（也可用环境变量 `OPENCODE_AUTH`） |
| `--json` | JSON 输出 |
| `--list` | 列出所有 workspace |

## 输出示例

```
OpenCode Go 用量  workspace: Default (wrk_xxxxxxxx)

  滚动用量  0%       重置剩 3小时 28分钟（08-15 21:05）
  每周用量  31%      重置剩 1天 18小时（08-17 11:00）
  每月用量  29%      重置剩 24天 12小时（09-09 02:00）
```

`--json` 输出结构：`{ workspace, rolling, weekly, monthly, fetchedAt }`，每个用量含 `{ status, resetInSec, usagePercent }`。

## FAQ

**Q: 报错「缺少 auth cookie」？**
A: 设置环境变量 `OPENCODE_AUTH` 或创建 `.env`。cookie 会过期，过期后重新从浏览器复制。

**Q: 报错「认证失败（HTTP 302）」？**
A: auth cookie 已过期或无效，重新登录 opencode.ai 获取新 cookie。

**Q: 网络不通？**
A: 本 skill 用 Node 原生 fetch 直连，不读 `HTTP(S)_PROXY` 环境变量。需要代理时请用 TUN/透明代理模式（如 Clash 的 TUN），让系统流量整体走代理。

**Q: 怎么知道自己的 workspace id？**
A: 运行 `node skill.js --list`（需先配置好 cookie 和任意一个 workspace id 作为入口）。
