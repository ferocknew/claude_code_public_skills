---
name: drawio-nodejs
description: 当用户要求"创建/编辑/导出 draw.io 流程图、架构图、时序图"，或操作私有化部署的 draw.io 服务（生成图表 XML、添加节点、连接节点、批量建图、导出 SVG/PNG/PDF、生成在线编辑/查看 URL、查询形状库）时使用此 skill。覆盖查询（shapes/status/config/view）与写入（new/add/connect/batch/export）两类意图。
skill_version: 260726.162630
---

# draw.io 远程操作工具

操作**私有化部署的 draw.io**：本地生成/编辑标准 `.drawio` XML，生成在线编辑与只读查看 URL，并在服务端启用导出后端时导出 SVG/PNG/PDF。图表 XML 的生成与编辑**不依赖服务端**（离线可用），只有 `status`/`export` 需要连接 draw.io 服务。

## 快速开始

```bash
# 1. 配置服务地址（复制 .env.example 为 .env 并填入真实地址）
cp .env.example .env
#   DRAWIO_URL=http://your-drawio-host:port

# 2. 检查服务连通性
node skill.js status

# 3. 从模板创建流程图
node skill.js new myflow --template flowchart

# 4. 添加节点并连接
node skill.js add myflow.drawio "用户请求" --shape roundedRect --color blue --x 200 --y 100
node skill.js connect myflow.drawio 1 2 --label "请求"

# 5. 生成在线编辑 URL（浏览器打开即可编辑）
node skill.js edit myflow.drawio

# 6. 导出（需服务端启用导出后端）
node skill.js export myflow.drawio svg
```

## 命令总表

| 命令 | 参数 | 说明 | 类型 |
|------|------|------|------|
| `status` | — | 检查 draw.io 服务连接状态 | 查询 |
| `new` | `<name>` | 创建新图表文件，支持 `--template` | 写入 |
| `add` | `<file> <label>` | 向图表添加节点 | 写入 |
| `connect` | `<file> <source> <target>` | 连接两个节点 | 写入 |
| `batch` | `<file> <data.json>` | 从 JSON 批量创建节点/连接/容器 | 写入 |
| `export` | `<file> [format]` | 导出为 svg/png/pdf/jpeg/xml/html | 写入 |
| `edit` | `<file>` | 生成在线编辑 URL（XML 编码进锚点） | 查询 |
| `view` | `<file>` | 生成只读查看 URL | 查询 |
| `shapes` | — | 列出可用形状与颜色（支持 `--query`） | 查询 |
| `config` | — | 显示当前配置 | 查询 |
| `live` | `[file]` | 启动本地实时预览，浏览器实时刷新（默认不启用） | 工具 |
| `help` | — | 显示帮助提示 | — |

## 选项

| 选项 | 适用命令 | 说明 |
|------|----------|------|
| `--url <url>` | 全局 | 覆盖 draw.io 服务地址 |
| `--output <file>` | new/export | 指定输出文件路径 |
| `--template <name>` | new | 模板：`flowchart` / `sequence` / `architecture` |
| `--shape <name>` | add | 节点形状（见 `shapes`，默认 `roundedRect`） |
| `--color <name>` | add | 颜色：blue/green/orange/red/purple/gray/yellow/teal/pink |
| `--style <str>` | add/connect | 自定义 draw.io 样式字符串 |
| `--x/--y/--width/--height <n>` | add | 节点坐标与尺寸 |
| `--parent <id>` | add | 父节点 ID（用于放入容器） |
| `--label <text>` | connect | 连接线标签 |
| `--query <keyword>` | shapes | 按关键词过滤形状 |
| `--scale/--bg/--border` | export | 导出缩放/背景色/边距 |
| `--port <n>` | live | 预览服务端口（默认 17777） |
| `--no-open` | live | 不自动打开浏览器 |

## 认证与配置

draw.io 私有化部署通常无需 token，仅需服务地址。配置优先级：命令行 `--url` > 环境变量 > `.env` 文件 > 代码默认值。

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `DRAWIO_URL` | draw.io 服务地址 | `http://localhost:8080` |
| `DRAWIO_REJECT_UNAUTHORIZED` | HTTPS 证书校验（自签证书设 `false`） | `true` |

在 skill 目录创建 `.env`（已被 `.gitignore`，不会提交）：

```bash
DRAWIO_URL=http://your-drawio-host:port
# DRAWIO_REJECT_UNAUTHORIZED=false
```

## batch 命令 JSON 格式

```json
{
  "nodes": [
    { "id": "a", "label": "入口", "shape": "roundedRect", "color": "blue", "x": 100, "y": 100 }
  ],
  "edges": [
    { "source": "a", "target": "b", "label": "调用" }
  ],
  "containers": [
    { "id": "g1", "label": "网关层", "x": 50, "y": 50, "width": 400, "height": 200 }
  ]
}
```

`nodes[].id` 与 `edges[].source/target` 可用自定义别名，工具会自动映射为生成的真实节点 ID。

## 实时预览（live）

默认**不启用**——不运行 `live` 命令时，所有命令行为完全不变（写入命令的推送函数在服务未启动时连接被拒即时返回，零开销）。适合 agent 自动化场景（agent 无需观察画面）。

需要"浏览器实时看到生成内容"时，用两个终端配合：

```bash
# 终端1：启动预览服务（自动打开浏览器，前台运行）
node skill.js live myflow.drawio

# 终端2：执行写入命令，浏览器即时刷新
node skill.js add myflow.drawio "新节点" --shape roundedRect --color blue
node skill.js connect myflow.drawio 1 2 --label "调用"
```

原理：`live` 在本地 `127.0.0.1:17777` 起一个 SSE 服务，浏览器打开的是容器页（iframe 嵌入私有 drawio 的 embed 模式）。每次 `new`/`add`/`connect`/`batch` 写完文件，会把最新 XML 推给容器，容器再通过 drawio 的 postMessage 协议让画面即时重绘。

| 选项 | 说明 |
|------|------|
| `[file]` | 初始加载的 `.drawio` 文件（可选） |
| `--port <n>` | 服务端口（默认 17777，可用 `DRAWIO_LIVE_PORT` 环境变量配置） |
| `--no-open` | 不自动打开浏览器 |

服务绑定 `127.0.0.1` 仅本机访问，XML 数据不出本机。Ctrl+C 停止。

## 常见问题

**Q: export 提示"服务端可能未启用导出后端"？**
A: draw.io 标准前端部署默认不含 REST 导出 API。需独立部署 [export-server](https://github.com/jgraph/drawio/tree/master/src/main/webapp) 并将 `DRAWIO_SERVER_URL` 指向它。未部署时可改用 `edit` 命令在浏览器中手动导出。

**Q: 生成的 `.drawio` 文件能在桌面版 draw.io 打开吗？**
A: 可以。本工具生成的 XML 符合标准 `mxfile` 格式，draw.io 桌面版、VS Code 扩展、在线版均可打开。

**Q: edit/view URL 很长？**
A: 正常。URL 锚点（`#R`）中编码了完整图表 XML，浏览器打开即加载该图，无需服务端存储。`edit` 可编辑，`view` 为只读 lightbox。

**Q: 如何查看所有可用形状？**
A: `node skill.js shapes` 列出全部；`node skill.js shapes --query network` 按关键词过滤。
