---
name: magpie-image-gen
description: 当需要AI生图、画图或调用Magpie混元生图时使用此技能。
skill_version: 261025.102001
---

# magpie-image-gen Skill (Node.js 驱动)

调用 Magpie 网关 OpenAI 兼容生图接口（`/v1/images/generations`）的专用生图 Skill，网关地址由 `.env` 中的 `MAGPIE_BASE_URL` 配置。

## 特性与优势
- **Node.js 零外部依赖驱动**：采用原生 Node.js（内置 `fetch`），无需 `npm install` 任何依赖，极速轻量通用。
- **凭据分离隔离**：API Key 与 Base URL 统一存放在 `.env` 文件中（权限 `600`），不在代码或 Skill 中硬编码敏感凭据。
- **开箱即用支持**：后端直连腾讯混元生图大模型（`Hunyuan-Image-v3.0-art`），出图画风细腻、汉字渲染极佳。
- **自动落盘与多媒体回显**：生成的图片自动下载并持久化保存至本地 `~/.cache/magpie_images/`，直接输出绝对路径与 QQ 平台的 `MEDIA:/path/to/img` 标签。
- **支持灵活规格**：支持配置尺寸（`1024x1024`、`768x1024`、`1280x720` 等）及批次生图（1~4 张）。

## 使用方法

### 1. 命令行调用（最常用）

```bash
node <skill目录>/scripts/generate_image.js "画面描述 Prompt"
```

#### 可选参数：
- `--size` 或 `-s`：指定分辨率，如 `1024x1024`（默认）、`768x1024`、`1280x720`
- `--n` 或 `-n`：生成张数（1~4，默认 1）
- `--output` 或 `-o`：指定保存的自定义文件路径
- `--json`：输出结构化 JSON 结果（供代码解析）

**示例**：
```bash
# 生成 16:9 横版风景
node <skill目录>/scripts/generate_image.js "赛博朋克风未来城市夜景，雨夜霓虹灯倒影" --size 1280x720

# 一次性生成 2 张供挑选
node <skill目录>/scripts/generate_image.js "复古街机像素风游戏封面" --n 2
```

### 2. Node.js 模块中导入

```javascript
const { generateImage } = require('<skill目录>/scripts/generate_image.js');

async function main() {
  const res = await generateImage({
    prompt: "日系Q版机械少女，金色羽翼，手持商神杖",
    size: "1024x1024"
  });
  if (res.success) {
    console.log("本地图片:", res.images[0]);
    console.log("QQ展示标签:", res.mediaTags[0]);
  } else {
    console.error("生图失败:", res.error);
  }
}
main();
```

## 核心避坑指南 (Pitfalls)

1. **切勿混淆 Vision 端点与生图功能**：Magpie 的 `/mcp/magpie/vision` 是专门且唯一的识图服务（仅含 `analyze_image` 工具），不提供生图接口；生图必须调用网关的 `/v1/images/generations` 路由。
2. **生图图片必须本地持久化回显**：生成的图片由云厂商提供临时签名 URL（有效时长有限），脚本必须先将其下载至本地绝对路径，并通过 `MEDIA:/absolute/path` 传递给聊天应用，避免链接失效导致用户端黑屏。
3. **中文 Prompt 原生适配**：后端挂载腾讯混元（Hunyuan-Image）大模型，对中文成语、古代意象、二次元风格有极高的理解力，无需特意将其翻译为英文 Prompt。
4. **WorkBuddy CN vs 国际版差异与扣费**：
   - 国内版（手机登录）：调度腾讯混元生图；生视频走可灵（Kling）。
   - 国际版（邮箱登录）：调度 `GPT-Image-2.5-Sunburst` 生图；生视频走 `Seedance-2.5`。
   - 扣费消耗的是账号自身的 Credits 积分（可在 `/v1/magpie/quotas` 查验），每日签到赠送的 Credits 覆盖常规低频生图需求。
   - 外部调用仅需 Magpie 自身的网关密钥（`Authorization: Bearer <MAGPIE_API_KEY>`），无需配置第三方云厂商商业 API Key。
5. **凭据安全与实现规范**：
   - 严禁在代码、日志、提交或文档中硬编码敏感 API Key，统一通过同目录下的 `.env`（`chmod 600`）动态加载。
   - 通用工具与外部集成脚本优先采用 Node.js 原生编写，避免 Python 虚拟环境与依赖版本问题。

## 详细架构与参考
- 参见 [references/magpie_image_architecture.md](references/magpie_image_architecture.md) 了解 Magpie 网关关于生图与多模态端点的底层设计原理。

## 环境配置 (.env)

配置文件位于：`<skill目录>/.env`（建议设为 600 权限）
- `MAGPIE_BASE_URL`: Magpie 网关基础地址（默认 `http://localhost:3425`，真实地址写入 `.env`）
- `MAGPIE_API_KEY`: Magpie 访问凭据（`sk-magpie-key-...`）
- `MAGPIE_IMAGE_MODEL`: 指定模型（留空则走 Magpie 后台默认选中的混元模型）
- `DEFAULT_SIZE`: 默认尺寸（`1024x1024`）
- `DEFAULT_OUTPUT_DIR`: 默认图片落盘保存目录（`~/.cache/magpie_images`）
