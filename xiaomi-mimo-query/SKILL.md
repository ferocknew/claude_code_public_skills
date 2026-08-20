---
name: xiaomi-mimo-query
description: 当用户要求"查询小米 MiMo 用量"、"小米 CodingPlan 用量"、"小米 mimo 额度"、"xiaomi mimo usage"、"查询 miMo 剩余 token"、"小米编程计划用量"时使用此 skill。通过小米开放平台 REST API（platform.xiaomimimo.com）查询 CodingPlan 的 token 用量（本月用量/计划总量/补偿额度），实时返回使用量与百分比。
skill_version: 260820.233037
---

# Xiaomi MiMo CodingPlan Usage

查询小米 MiMo CodingPlan 的 token 用量余量。通过小米开放平台 REST API 实时返回**本月用量 / 计划总量 / 补偿额度**的使用量与百分比。

## 快速开始

```bash
# 查询用量
node skill.js

# 输出 JSON
node skill.js --json
```

## 配置

支持环境变量或本 skill 同目录下的 `.env` 文件（参考 `.env.example`，`.env` 已被 gitignore 不会提交）：

```bash
export XIAOMI_MIMO_COOKIE="api-platform_serviceToken=xxx; userId=xxx; ..."   # 必需：浏览器完整 cookie
```

**cookie 获取**：浏览器登录 https://platform.xiaomimimo.com → F12 → Network → 刷新页面 → 任选一个请求 → Request Headers → 复制整个 `cookie:` 的值。

请求使用 Node 原生 fetch 直连（携带完整浏览器 headers），不走系统代理；需要代理时请用 TUN/透明代理模式。

## 命令总表

| 命令 | 说明 |
|------|------|
| `node skill.js` | 查询用量（默认文本输出） |
| `node skill.js --cookie '<v>'` | 临时指定 cookie |
| `node skill.js --json` | 输出 JSON（适合脚本/statusline） |
| `node skill.js --help` | 显示帮助 |
| `node skill.js --version` | 显示版本 |

## 选项

| 选项 | 说明 |
|------|------|
| `--cookie <v>` | 浏览器 cookie（也可用环境变量 `XIAOMI_MIMO_COOKIE`） |
| `--json` | JSON 输出 |

## 输出示例

```
小米 MiMo CodingPlan 用量

  本月用量  0.59%     使用 223.4M / 38.0B tokens
  计划总量  1.00%     使用 223.4M / 38.0B tokens
  补偿额度  0.00%     使用 0 / 0 tokens
```

`--json` 输出结构：`{ month, plan, compensation, fetchedAt }`，每个额度含 `{ name, used, limit, percent }`。

## FAQ

**Q: 报错「缺少 cookie」？**
A: 设置环境变量 `XIAOMI_MIMO_COOKIE` 或创建 `.env`。cookie 会过期，过期后重新从浏览器复制。

**Q: 报错「认证失败（HTTP 401/403）」？**
A: cookie 已过期或无效，重新登录 platform.xiaomimimo.com 获取新 cookie。

**Q: 网络不通？**
A: 本 skill 用 Node 原生 fetch 直连，不读 `HTTP(S)_PROXY` 环境变量。需要代理时请用 TUN/透明代理模式（如 Clash 的 TUN），让系统流量整体走代理。