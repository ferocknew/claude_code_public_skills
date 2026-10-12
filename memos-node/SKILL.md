---
name: memos-node
description: 当用户要求"记录一条 memo"、"写备忘"、"发 memos"、"查我的 memos"、"搜索 memos 笔记"、"按标签找 memo"、"编辑/删除 memo"、"归档 memo"、"给 memo 加评论或表情"、"上传附件到 memos"、"查看 memos 实例信息"时使用此 skill。通过 Memos REST API（/api/v1）操作自托管 Memos 实例，零依赖打包（node skill.js 直接可用，无需 npm install）。
skill_version: 261012.181624
---

# Memos API 客户端（memos-node）

通过 Memos 官方 REST API（`/api/v1`）操作自托管 Memos 实例，**已打包为单文件，无需 npm install**。

覆盖对象：memo（增删改查/归档/置顶/评论/表情/标签）、attachment（上传下载）、user、instance。

## 快速开始

```bash
# 配置实例与令牌（写入本目录 .env，或直接 export）
export MEMOS_URL=https://memos.example.com
export MEMOS_TOKEN=your-access-token

# 写一条 memo
node skill.js memo create "今天读了 #Rust 所有权章节"

# 列最近的 memo
node skill.js memo list --limit 10

# 按标签 + 关键字搜索
node skill.js memo list --tag Rust --search 所有权 --since 30d
```

## 命令总表

| 命令 | 用途 | 关键参数 |
|------|------|----------|
| `memo list` | 列出/搜索 memo | `--limit` `--tag` `--search` `--visibility` `--since` `--pinned` `--archived` `--orderby` `--filter` `--pagetoken` |
| `memo get <uid>` | 查看单条 memo | 无 |
| `memo create <内容>` | 新建 memo | `--content` `--visibility` `--pinned` `--memoId` |
| `memo update <uid>` | 修改内容/可见性/置顶 | `--content` `--visibility` `--pinned` |
| `memo delete <uid>` | 删除 memo | `--force` |
| `memo archive <uid>` | 归档 | 无 |
| `memo restore <uid>` | 从归档恢复 | 无 |
| `memo pin / unpin <uid>` | 置顶 / 取消置顶 | 无 |
| `memo comments <uid>` | 列出评论 | `--limit` |
| `memo comment <uid> <内容>` | 添加评论 | `--visibility` |
| `memo reactions <uid>` | 列出表情回应 | 无 |
| `memo react <uid> <表情>` | 添加表情回应 | `--type` |
| `memo unreact <uid> <id>` | 删除表情回应 | `--id` |
| `memo tags` | 统计标签及数量 | `--limit` |
| `attachment list` | 列出附件 | `--limit` `--filter` |
| `attachment get <uid>` | 附件元信息 | 无 |
| `attachment upload <本地文件>` | 上传附件 | `--memo <uid>` `--filename` `--type` |
| `attachment download <uid>` | 下载附件 | `--out <路径>` |
| `attachment delete <uid>` | 删除附件 | 无 |
| `user list` | 列出实例用户 | `--limit` |
| `user get <用户名>` | 查看用户 | 无 |
| `user me` | 查看当前账号 | 无 |
| `user stats <用户名>` | 用户统计 | 无 |
| `instance profile` | 实例信息（版本/管理员/访问模式） | 无 |
| `instance stats` | 实例存储统计 | 无 |

命令别名：`list`/`ls`、`get`/`show`、`create`/`new`/`add`、`update`/`edit`、`delete`/`rm`、`upload`/`put`、`download`/`dl`。

## 通用选项

| 选项 | 说明 |
|------|------|
| `--url <地址>` | 实例地址（默认取 `MEMOS_URL`，再默认 `http://localhost:5230`） |
| `--token <令牌>` | 个人访问令牌（默认取 `MEMOS_TOKEN`） |
| `--format <格式>` | `json`（默认）/ `yaml` / `table` |
| `--timeout <毫秒>` | 请求超时（默认 30000） |
| `--insecure` | 跳过 TLS 证书校验（自签名证书场景） |
| `-h, --help` | 显示帮助 |
| `-v, --version` | 显示版本 |

## 认证与配置

在 Memos 网页端「设置 → 访问令牌」创建个人访问令牌，请求以 `Authorization: Bearer <token>` 发送。

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `MEMOS_URL` | 实例地址 | `http://localhost:5230` |
| `MEMOS_TOKEN` | 个人访问令牌 | 无（写操作必需） |
| `MEMOS_TIMEOUT` | 请求超时毫秒 | `30000` |
| `MEMOS_INSECURE` | `true` 时跳过 TLS 校验 | `false` |

也可复制 `.env.example` 为同目录 `.env` 填写；已存在的环境变量优先于 `.env`。

## 过滤与排序

`memo list` 的快捷选项会拼成 Memos 的 CEL 过滤表达式（`--filter` 传入原生表达式时以 `&&` 组合）：

| 快捷选项 | 生成的 CEL |
|----------|-----------|
| `--tag Rust` | `"Rust" in tags` |
| `--search 所有权` | `content.contains("所有权")` |
| `--visibility PUBLIC` | `visibility == "PUBLIC"` |
| `--since 7d` | `created_ts > now - duration("168h")` |
| `--pinned` | `pinned == true` |

`--since` 支持 `30m` / `24h` / `7d` / `2w`，或 ISO 时间戳（如 `2026-01-01T00:00:00Z`）。

可用 CEL 字段：`content`、`creator`、`created_ts`、`updated_ts`、`pinned`、`visibility`、`tags`、`has_link`、`has_task_list`、`has_code`、`has_incomplete_tasks`。

`--orderby` 默认 `create_time desc`，支持 `pinned desc, create_time desc`（字段：`pinned`、`create_time`、`update_time`、`name`）。注意排序用 `create_time`，过滤用 `created_ts`。

`--archived` 等价于 `state=ARCHIVED`；不加时只返回正常 memo。

## 输出格式

默认 JSON 到 stdout；错误输出 `{error, message, status, hint}` JSON 到 stderr，退出码 1（参数错误为 2）。

`--format yaml` 比 JSON 省约 40% token，适合 LLM 阅读；`--format table` 适合人眼快速浏览列表。

## 常见问题

**Q: 报 `401` 或提示未认证？**
检查 `MEMOS_TOKEN` 是否为有效的个人访问令牌（在 Memos 网页端「设置 → 访问令牌」创建），且未过期。注意 token 与 `--url` 必须属于同一实例。

**Q: 列表返回空，但网页上能看到 memo？**
Memos 的列表接口按调用者权限过滤。token 对应的账号只能看到自己创建或有权访问的 memo；PRIVATE memo 仅作者可见。确认 token 属于正确的账号。

**Q: 按标签搜索没有结果？**
标签过滤使用 `"标签名" in tags`，标签名**不带** `#`。子标签（如 `#work/project`）需写完整路径。

**Q: `memo update` 报缺少字段？**
`updateMask` 由工具按实际传入的选项自动生成；至少要提供 `--content` / `--visibility` / `--pinned` 之一。

**Q: 上传大文件失败？**
`attachment upload` 走单次 base64 上传，适合数 MB 以内的文件。更大文件请用 Memos 网页端或客户端分片上传接口（`/api/v1/attachments:upload`）。

**Q: 自签名证书报证书错误？**
加 `--insecure`，或设 `MEMOS_INSECURE=true`。该选项进程级关闭 TLS 校验，仅建议内网使用。

**Q: 不同 Memos 版本接口有差异？**
本工具面向 0.2x/0.31 的 `/api/v1` 路径。Memos 新版将 REST 路径迁到 `/api`（如 `/api/memos`），届时需相应调整 `lib/api.js` 中的路径。

## 开发

```bash
pnpm install && pnpm run build   # run.js -> skill.js
node skill.js --help             # 验证
```
