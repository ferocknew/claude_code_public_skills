# Magpie 网关生图与多模态架构参考

## 1. Magpie 网关端点分类

Magpie 网关（地址由 `MAGPIE_BASE_URL` 配置，默认端口 `3425`）在多模态与工具服务上采用了明确的边界分流设计：

| 端点类型 | 路径 / 接口 | 功能定位 | 核心工具 / 格式 |
|---|---|---|---|
| **识图 MCP (Vision)** | `/mcp/magpie/vision` | 专为纯文本 Agent 赋能的图像理解/OCR 服务 | `analyze_image`（仅限以图生文） |
| **搜索 MCP (Search)** | `/mcp/magpie/web-search` | 标准化的互联网联网搜索端点 | `web_search`、`web_fetch` |
| **生图接口 (Image Gen)** | `POST /v1/images/generations` | 标准 OpenAI 兼容文生图接口 | 接收 `prompt`、`size`、`n` 等 |
| **图像编辑 (Image Edit)** | `POST /v1/images/edits` | 带参考图的图像融合与二次创作接口 | 接收 `prompt`、`images` (数组) |
| **视频生成 (Video Gen)** | `POST /v1/videos` | 文生视频 / 首帧图生视频接口 | 接收 `prompt`、`seconds`、`image` |

## 2. 为什么 `/mcp/magpie/vision` 没有生图能力？

- Magpie 源码的 vision MCP 模块（`vision_mcp.go`）规定：`/mcp/magpie/vision` 为 Streamable HTTP MCP 端点，其名称为 `magpie-vision`，提供单一 `analyze_image` 工具。
- 该工具的作用是解决无法读取图片的模型理解截图、图表、报错信息的问题，因此该端点被设计为只读（Read-Only）与非生图接口。

## 3. Magpie 原生生图逻辑与腾讯混元模型

- **模型配置**：Magpie Web 控制台（网关主机的 `3430` 端口）的「设置 › 模型 › 图像 › 生图模型」中，已将默认生图模型指定为 `Hunyuan-Image-v3.0-art`。
- **请求转发**：客户端在调用 `POST /v1/images/generations` 时，请求体无需强制指定 `model` 字段，网关会自动将未指定模型的请求路由至控制台所选定的默认模型。
- **返回数据处理**：
  - 上游返回通常为腾讯云 COS 对象存储的带签名临时图片 URL，或直接返回 Base64 编码的 `b64_json` 字符串。
  - 为防止签名过期（腾讯云默认签名几小时至一天内失效），客户端必须立即发起 HTTP GET 下载图片流并持久化落地到本地磁盘。

## 4. WorkBuddy 国内版 vs 国际版差异与计费/Key机制

- **版本与模型映射**：
  - **WorkBuddy CN（国内版，手机号认证）**：后端调度腾讯混元（`Hunyuan-Image-v3.0-art`）生图，中文语义还原极强；生视频走可灵（Kling）链路。
  - **WorkBuddy Global（国际版，邮箱认证）**：后端调度 `GPT-Image-2.5-Sunburst` 等国际上游；生视频走 `Seedance-2.5`。
- **扣费机制**：
  - 扣除的是对应账号体系下的 **Credits 积分配额**（可在 `/v1/magpie/quotas` 查询实时余额），账号日常签到赠送的 Credits 满足常规低频生图需求。
- **鉴权机制**：
  - 外部客户端仅需提供 Magpie 自身的访问凭证（`Authorization: Bearer <MAGPIE_API_KEY>`），无需向腾讯云或第三方单独申请商业 API Secret Key（Magpie 容器内部已完成服务商会话托管）。
