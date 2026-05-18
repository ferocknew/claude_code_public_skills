---
name: mind-map-skill
description: 思维导图远程控制工具。通过 REST API 操作 simple-mind-map 思维导图应用，支持读取、添加、删除、更新节点以及覆盖整图。当用户提到以下场景时，应主动使用本技能：操作思维导图、读取思维导图内容、添加/删除/修改思维导图节点、用 JSON 数据覆盖思维导图、查看思维导图结构。即使用户没有明确说"思维导图"，只要涉及 mind map、脑图、心智图等话题，都应考虑使用本技能。
skill_version: 260518.133954
---

# 思维导图远程控制工具

## 概述

本工具通过 REST API Bridge 远程控制 simple-mind-map 思维导图应用，支持读取导图结构、增删改节点、以及用 JSON 数据覆盖整图。

**运行方式（无需安装依赖）：**

```bash
node skill.js <command> [args] [options]
```

## 使用前提

1. 思维导图应用已在浏览器中打开（如 `http://localhost:8086`）
2. API Bridge 模块已启用（应用内置）
3. 浏览器与服务器保持 WebSocket 连接
4. 如需认证，配置 `MIND_MAP_API_TOKEN`

---

## 命令参考

### 1. status — 检查连接状态

```bash
node skill.js status
```

检查浏览器是否已连接到 API Bridge。返回 `browserConnected` 布尔值和待处理请求数。

**返回示例：**
```json
{
  "browserConnected": true,
  "pendingRequests": 0
}
```

### 2. read — 读取思维导图

```bash
node skill.js read [--format tree|json|summary]
```

| 选项 | 说明 |
|------|------|
| `--format tree` | 缩进树形视图（默认，最省 token） |
| `--format json` | 原始 API 响应 |
| `--format summary` | 统计摘要（节点数、深度、一级子节点列表） |

**tree 格式示例：**
```
abc123: 根节点
  def456: 子节点A [note]
  ghi789: 子节点B [collapsed]
    jkl012: 孙节点
```

**summary 格式示例：**
```json
{
  "root": { "uid": "abc123", "text": "根节点" },
  "totalNodes": 15,
  "maxDepth": 4,
  "topChildren": [
    { "uid": "def456", "text": "子节点A", "children": 3 },
    { "uid": "ghi789", "text": "子节点B", "children": 1 }
  ]
}
```

### 3. add — 添加子节点

```bash
node skill.js add "节点文本" [--parent <uid>]
```

| 参数 | 说明 |
|------|------|
| `<文本>` | 新节点文本（必需） |
| `--parent <uid>` | 父节点 UID（可选，默认添加到根节点） |

**示例：**
```bash
node skill.js add "新想法"
node skill.js add "子项" --parent abc123
```

### 4. delete — 删除节点

```bash
node skill.js delete <uid>
```

| 参数 | 说明 |
|------|------|
| `<uid>` | 要删除的节点 UID（必需，不能删除根节点） |

**示例：**
```bash
node skill.js delete abc123
```

### 5. update — 更新节点文本

```bash
node skill.js update <uid> "新文本"
```

| 参数 | 说明 |
|------|------|
| `<uid>` | 节点 UID（必需） |
| `<文本>` | 新的文本内容（必需） |

**示例：**
```bash
node skill.js update abc123 "修改后的文本"
```

### 6. write — 从 JSON 文件覆盖整图

```bash
node skill.js write <json-file>
```

| 参数 | 说明 |
|------|------|
| `<json-file>` | JSON 文件路径（必需） |

JSON 文件格式与 `read --format json` 返回的 `data` 字段一致，支持两种结构：

**标准格式：**
```json
{
  "data": { "text": "根节点" },
  "children": [
    { "data": { "text": "子节点" }, "children": [] }
  ]
}
```

**扁平格式：**
```json
{
  "text": "根节点",
  "children": [
    { "text": "子节点", "children": [] }
  ]
}
```

### 7. config — 显示当前配置

```bash
node skill.js config
```

显示 `.env` 文件中的配置信息（Token 会脱敏显示）。

---

## 全局选项

| 选项 | 说明 |
|------|------|
| `--url <url>` | 覆盖 API 服务器地址 |
| `--token <t>` | 覆盖 API Token |
| `-h, --help` | 显示帮助 |
| `-v, --version` | 显示版本 |

---

## 典型工作流

1. `status` — 确认浏览器已连接
2. `read` — 查看当前思维导图结构
3. `add` — 添加新节点
4. `update` — 修改节点内容
5. `delete` — 删除不需要的节点
6. `write` — 用完整 JSON 数据替换整图

---

## 输出格式

所有命令输出 JSON 到 stdout。

**成功示例：**
```json
{
  "success": true,
  "format": "tree",
  "tree": "abc123: 根节点\n  def456: 子节点"
}
```

**错误示例：**
```json
{
  "success": false,
  "error": "Browser not connected",
  "message": "请确保思维导图应用已在浏览器中打开"
}
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MIND_MAP_URL` | API 服务器地址 | `http://localhost:8086` |
| `MIND_MAP_API_TOKEN` | API Token（可选） | 空 |
| `MIND_MAP_REJECT_UNAUTHORIZED` | HTTPS 证书验证 | `false` |

---

## 常见问题

### Q: status 返回 browserConnected: false 怎么办？

**A:** 请确保思维导图应用已在浏览器中打开，并且页面处于活跃状态。API Bridge 依赖 WebSocket 连接，页面关闭或刷新会断开连接。

### Q: 请求超时怎么办？

**A:** 检查服务器地址是否正确、网络是否可达、自签名证书配置是否匹配。可使用 `config` 命令查看当前配置。

### Q: 如何获取节点的 UID？

**A:** 使用 `read` 命令读取思维导图，每个节点前会显示其 UID。

### Q: 可以删除根节点吗？

**A:** 不可以。根节点无法删除，但可以使用 `update` 修改根节点文本，或使用 `write` 覆盖整图。
