---
name: mind-map-skill
description: 思维导图远程控制工具。通过 REST API 操作 simple-mind-map 思维导图应用，支持完整 CRUD、节点移动/排序/插入、备注/超链接/图标/标签、撤销重做、展开收起、搜索、以及通过 exec 命令调用全部 45 个 simple-mind-map 命令。当用户提到以下场景时，应主动使用本技能：操作思维导图、读取思维导图内容、添加/删除/修改思维导图节点、移动节点、搜索节点、调整结构、用 JSON 数据覆盖思维导图。即使用户没有明确说"思维导图"，只要涉及 mind map、脑图、心智图等话题，都应考虑使用本技能。
skill_version: 260518.143406
---

# 思维导图远程控制工具

## 概述

本工具通过 REST API Bridge 远程控制 simple-mind-map 思维导图应用，支持完整的节点操作、结构调整、属性设置和通用命令执行。

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

### 基础命令

#### 1. status — 检查连接状态

```bash
node skill.js status
```

#### 2. read — 读取思维导图

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

#### 3. add — 添加子节点

```bash
node skill.js add "节点文本" [--parent <uid>]
```

| 参数 | 说明 |
|------|------|
| `<文本>` | 新节点文本（必需） |
| `--parent <uid>` | 父节点 UID（可选，默认添加到根节点） |

#### 4. delete — 删除节点

```bash
node skill.js delete <uid>
```

不能删除根节点。

#### 5. update — 更新节点文本

```bash
node skill.js update <uid> "新文本"
```

#### 6. write — 从 JSON 文件覆盖整图

```bash
node skill.js write <json-file>
```

#### 7. config — 显示当前配置

```bash
node skill.js config
```

### 节点操作

#### 8. move — 移动节点

```bash
node skill.js move <uid> <targetUid>
```

将节点移动为目标节点的子节点。

**示例：**
```bash
node skill.js move abc123 def456
```

#### 9. up — 上移节点

```bash
node skill.js up <uid>
```

同级节点中上移一位。

#### 10. down — 下移节点

```bash
node skill.js down <uid>
```

同级节点中下移一位。

#### 11. insert — 插入同级节点

```bash
node skill.js insert <uid> "文本"
```

在指定节点旁插入一个同级节点。

#### 12. insert-parent — 插入父级节点

```bash
node skill.js insert-parent <uid> "文本"
```

在指定节点上方插入一个父级节点，原节点成为新节点的子节点。

### 节点属性

#### 13. note — 设置节点备注

```bash
node skill.js note <uid> "备注内容"
```

传空字符串清除备注。

**示例：**
```bash
node skill.js note abc123 "这是详细说明"
node skill.js note abc123 ""
```

#### 14. link — 设置节点超链接

```bash
node skill.js link <uid> <url> [--title "标题"]
```

传空字符串清除链接。

**示例：**
```bash
node skill.js link abc123 "https://example.com"
node skill.js link abc123 "https://example.com" --title "参考文档"
```

### 历史操作

#### 15. undo — 撤销

```bash
node skill.js undo [--step <n>]
```

撤销最近操作，默认 1 步。

#### 16. redo — 重做

```bash
node skill.js redo [--step <n>]
```

重做最近撤销的操作，默认 1 步。

### 视图控制

#### 17. expand — 展开节点

```bash
node skill.js expand [uid]
```

指定 uid 展开该节点，不指定则展开全部。

#### 18. collapse — 收起节点

```bash
node skill.js collapse [uid]
```

指定 uid 收起该节点，不指定则收起全部。

### 搜索

#### 19. search — 搜索节点

```bash
node skill.js search <keyword>
```

按关键词搜索节点文本，返回匹配节点的 UID、文本和路径。

**返回示例：**
```json
{
  "success": true,
  "keyword": "停车",
  "totalMatches": 3,
  "results": [
    { "uid": "abc123", "text": "停车费用测试", "path": "根节点 > 停车费用测试" },
    { "uid": "def456", "text": "停车位置验证", "path": "根节点 > RFID测试 > 停车位置验证" }
  ]
}
```

### 高级命令

#### 20. exec — 执行任意 execCommand

```bash
node skill.js exec <command> [args-json]
```

直接调用 simple-mind-map 的任意 `execCommand`，解锁全部 45 个命令。`args-json` 为 JSON 格式的命令参数，uid 会自动解析为节点引用。

**常用 exec 命令：**

| 命令 | args 示例 | 说明 |
|------|----------|------|
| `SET_NODE_TAG` | `{"uid":"abc","tag":["重要"]}` | 设置标签 |
| `SET_NODE_ICON` | `{"uid":"abc","icons":["emoji_1f525"]}` | 设置图标 |
| `SET_NODE_SHAPE` | `{"uid":"abc","shape":"rectangle"}` | 设置形状 |
| `SET_NODE_STYLE` | `{"uid":"abc","prop":"fillColor","value":"#ff0000"}` | 设置样式 |
| `SET_NODE_IMAGE` | `{"uid":"abc","data":{"url":"...","title":"图"}}` | 设置图片 |
| `ADD_GENERALIZATION` | `{"data":{"text":"概要"}}` | 添加概要 |
| `ADD_OUTER_FRAME` | `{"uids":["abc"],"config":{}}` | 添加外框 |
| `GO_TARGET_NODE` | `{"uid":"abc"}` | 定位到节点 |
| `RESET_LAYOUT` | `{}` | 重置布局 |
| `UNEXPAND_TO_LEVEL` | `{"level":2}` | 展开到指定层级 |

**示例：**
```bash
node skill.js exec SET_NODE_TAG '{"uid":"abc123","tag":["重要","待办"]}'
node skill.js exec RESET_LAYOUT '{}'
node skill.js exec UNEXPAND_TO_LEVEL '{"level":2}'
```

---

## 全局选项

| 选项 | 说明 |
|------|------|
| `--url <url>` | 覆盖 API 服务器地址 |
| `--token <t>` | 覆盖 API Token |
| `--step <n>` | 撤销/重做步数（默认 1） |
| `--title <t>` | 链接标题（link 命令） |
| `-h, --help` | 显示帮助 |
| `-v, --version` | 显示版本 |

---

## 典型工作流

1. `status` — 确认浏览器已连接
2. `read` / `search` — 查看当前结构或搜索节点
3. `add` / `insert` — 添加新节点
4. `update` / `note` / `link` — 丰富节点内容
5. `move` / `up` / `down` — 调整节点位置和结构
6. `undo` — 误操作时撤销
7. `write` — 用完整 JSON 数据替换整图

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

**A:** 使用 `read` 命令读取思维导图，每个节点前会显示其 UID。也可用 `search` 按关键词搜索获取 UID。

### Q: 可以删除根节点吗？

**A:** 不可以。根节点无法删除，但可以使用 `update` 修改根节点文本，或使用 `write` 覆盖整图。

### Q: 如何设置节点颜色/图标/标签等高级属性？

**A:** 使用 `exec` 命令调用对应的 `SET_NODE_*` 命令。例如：`node skill.js exec SET_NODE_TAG '{"uid":"abc","tag":["重要"]}'`

### Q: 误操作了怎么办？

**A:** 使用 `undo` 命令撤销。支持多步撤销：`node skill.js undo --step 3`。
