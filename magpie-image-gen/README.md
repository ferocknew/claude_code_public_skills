# magpie-image-gen

Magpie 网关 AI 生图技能：通过 OpenAI 兼容接口生成图片并落盘本地，供 Claude Code 等 Agent 调用。

## 特性

- 零依赖：Node 18+ 原生 `fetch`，无需 `npm install`
- 凭据分离：真实地址与 Key 存 `.env`（不入库），代码默认值仅占位符
- 自动落盘：b64 / 临时 URL 双通道下载持久化，输出 `MEDIA:<绝对路径>` 回显标签
- 规格灵活：`1024x1024`、`768x1024`、`1280x720` 等尺寸，1~4 张批量生成

## 快速开始

```bash
cp .env.example .env     # 填入 MAGPIE_BASE_URL 与 MAGPIE_API_KEY
node scripts/generate_image.js "赛博朋克风未来城市夜景，雨夜霓虹灯倒影" --size 1280x720
```

## 命令与选项

| 选项 | 说明 | 默认 |
|------|------|------|
| `--size, -s` | 分辨率 | 1024x1024（可由 .env 覆盖） |
| `--n, -n` | 生成张数（1~4） | 1 |
| `--model, -m` | 覆盖生图模型 | 网关默认（Hunyuan-Image-v3.0-art） |
| `--output, -o` | 指定保存路径（仅生成 1 张时生效） | 自动文件名 |
| `--json` | 结构化 JSON 输出（供代码解析） | 关闭 |

模块调用：`const { generateImage } = require('./scripts/generate_image.js')`，
返回 `{ success, images, mediaTags, error }`，不抛异常。

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| MAGPIE_BASE_URL | 网关地址（不含 /v1） | http://localhost:3425 |
| MAGPIE_API_KEY | 网关凭据（必填） | 无 |
| MAGPIE_IMAGE_MODEL | 指定模型 | 留空走网关配置 |
| DEFAULT_SIZE | 默认尺寸 | 1024x1024 |
| DEFAULT_OUTPUT_DIR | 落盘目录（绝对路径） | ~/.cache/magpie_images |

## 代码约束（贡献者必读）

- CommonJS、Node 18+、零第三方依赖；注释与输出简体中文
- 隐私红线：禁止硬编码内网 IP、token、密码、内部域名与内部部署路径；
  默认值用 localhost 或占位符，真实值由 `.env` 注入
- `.env` 不入库（根 .gitignore 已覆盖）；`.env.example` 仅放占位符
- `generateImage()` 不抛异常，统一返回结果对象；fetch 必须带
  `AbortSignal.timeout`（生图 300 秒 / 下载 60 秒）
- 修改后验证：`node --check scripts/generate_image.js`，并按 CLAUDE.md
  的验证清单跑错误路径冒烟与隐私扫描

## 已知限制

- `--output` 仅在生成 1 张时生效，多张时自动命名并向 stderr 输出警告
- 上游图片 URL 为临时签名地址有时效，脚本已即时落盘，勿缓存 URL 复用
