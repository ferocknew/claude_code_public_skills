# CLAUDE.md

本文件为 Claude Code 在 magpie-image-gen 技能内工作时提供指导。

## 技能定位

调用 Magpie 网关 OpenAI 兼容生图接口（`POST /v1/images/generations`）的生图技能。
后端默认模型 `Hunyuan-Image-v3.0-art`（腾讯混元，中文 Prompt 原生适配）。

结构形态：`SKILL.md` + `scripts/generate_image.js` + `references/` + `.env`。
**不属于 Bundled**（无 run.js / build.js / package.json / skill.js），也非 Agent-only，
是仓库的第三种形态，不要照搬 esbuild 打包流程。

## 文件结构

| 文件 | 职责 |
|------|------|
| SKILL.md | LLM 运行手册（用法、选项、避坑） |
| scripts/generate_image.js | 唯一实现：CLI 入口 + `generateImage` 模块导出 |
| references/magpie_image_architecture.md | 网关端点 / 模型 / 计费架构参考 |
| .env | 真实凭据（根 .gitignore 已覆盖，不入库） |
| .env.example | 配置模板（仅占位符，可提交） |

## 开发约束

- CommonJS、Node 18+ 全局 `fetch`、零第三方依赖，保持现状不引入依赖
- 隐私红线：代码 / 文档 / help 禁止硬编码内网 IP、token、密码、内部域名、内部部署路径；
  默认值一律 `localhost` / 占位符 / `os.homedir()` 展开，真实值由 `.env` 注入
- 错误契约：`generateImage()` 永远返回 `{ success, images, mediaTags, error }`，
  不得向调用方抛裸异常；同步操作（mkdir / write）均在 try 内
- 请求超时：生图 300 秒、图片下载 60 秒（`AbortSignal.timeout`），
  catch 中按 `err.name`（TimeoutError/AbortError）翻译为中文超时提示
- `n` 钳位 1~4，解析后必须 `Number.isFinite` 防护，禁止 NaN 进入请求体
- 自动文件名 `img_<时间戳>_<序号>_<随机4>.<ext>`：随机后缀防同秒覆盖；
  扩展名由图片魔数推断（png/jpg/webp），显式 `--output` 尊重用户扩展名
- 配置优先级：CLI 参数 > 环境变量 > `.env` > 代码默认值
- 注释与输出用简体中文

## 验证清单

```bash
node --check scripts/generate_image.js                    # 语法
node scripts/generate_image.js                            # 用法提示, exit 1
node scripts/generate_image.js "t" --n abc                # --n 校验, exit 1
node scripts/generate_image.js "t" --jso                  # 未知选项, exit 1
MAGPIE_BASE_URL=http://127.0.0.1:9 MAGPIE_API_KEY=t \
  node scripts/generate_image.js "t" --json               # 连接失败契约, 不发真实请求
grep -rniE "10\.0\.|192\.168\.|172\.16\.|hermes" . --exclude=.env  # 隐私扫描, 应零匹配
```

真实生图验证需网关可达且消耗 Credits，非必要不跑。

## 已知避坑（源自 SKILL.md Pitfalls）

- `/mcp/magpie/vision` 仅识图（analyze_image），生图必须走 `/v1/images/generations`
- 上游返回临时签名 URL 或 b64_json，必须立即落盘本地，`MEDIA:<绝对路径>` 回显
- 请求体可不带 `model` 字段，网关自动路由控制台配置的默认模型

## Session 历史

**2026-10-25**：初版审计与修复。

- P0 隐私：5 处内网 IP 与内部部署路径硬编码全部脱敏为 localhost / 占位符写法；
  User-Agent 内部代号中性化；references 架构文档 IP 占位化；删除含旧源码的 `__pycache__`
- P1 缺陷：补 fetch 超时（300s / 60s）；删除 try 块外的 mkdirSync 防裸异常；
  空响应不再误报 success（附原始响应摘要）；`n` 防 NaN；文件名加随机后缀防同秒覆盖；
  `--output` 配合 `-n>1` 时输出 stderr 警告
- P2：`version` 改 `skill_version` 时间戳格式；删除依赖 requests 的死代码
  generate_image.py（与零依赖叙述冲突）；CLI 未知选项 / 多余参数报错；魔数推断扩展名
- 验证：`node --check` 与 6 项错误路径实测通过；隐私扫描零匹配；`.env` 确认未被跟踪
