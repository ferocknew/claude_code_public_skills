# CLAUDE.md

## 项目概述

DeepSeek 官方 Search / Fetch 接口命令行工具（Node.js 版），命令组：search / fetch / config。零运行时依赖，使用 Node.js 18+ 内置 `fetch`；API Key 存于本地 `.env`，打包产物为 `skill.js`。

## 目录结构

```
deepseek-search/
  SKILL.md          # LLM 使用文档（瘦索引）
  CLAUDE.md         # 开发指引（本文件）
  README.md         # 人类用户文档
  run.js            # 源码入口（帮助文本 + 命令分发 + 退出码）
  skill.js          # 打包产物（由 build.js 生成，提交仓库）
  build.js          # esbuild 打包脚本，自动更新 SKILL.md 的 skill_version
  package.json      # 依赖配置（仅 esbuild devDep）
  .env              # 本地 API Key（不提交，已被 .gitignore 忽略）
  .env.example      # 环境变量模板（仅占位符，可提交）
  .gitignore        # 本目录兜底忽略规则
  lib/
    api.js          # HTTP 封装：端点常量、deepseekRequest、searchWeb / fetchPage、key 读取与 saveApiKey
    env.js          # .env 路径解析、key 解析优先级、缺失 key 提示、交互式询问
    cli.js          # argv 解析与选项校验（KNOWN_OPTIONS / SHORT_ALIASES / BOOLEAN_FLAGS）
    output.js       # table / json / markdown 渲染与 fetch 正文输出
    errors.js       # 统一错误结构 { error, message } 与退出码常量
    cmd/
      index.js      # 命令聚合导出
      search.js     # search 命令
      fetch.js      # fetch 命令（含 URL 校验）
      config.js     # config show / path / set-key
```

## 常用命令

```bash
pnpm install            # 安装构建依赖（仅 esbuild）
node run.js <command>   # 开发模式运行
npm run build           # 打包 run.js + lib/* -> skill.js
node skill.js <command> # 运行打包版本
node skill.js --help    # 查看帮助
```

## API 端点映射

| 命令 | 方法 | 端点 |
|------|------|------|
| search | POST | `https://api.deepseek.com/v1/tools/search` |
| fetch | POST | `https://api.deepseek.com/v1/tools/fetch` |

鉴权：请求头 `Authorization: Bearer <DeepSeek API Key>` + `Content-Type: application/json`，与 DeepSeek 模型 API 共用同一套 key。baseUrl 默认 `https://api.deepseek.com`，可用 `DEEPSEEK_BASE_URL` 覆盖。

请求字段：

| 端点 | 字段 | 必需 | 说明 |
|------|------|------|------|
| search | `query` | 是 | 1~128 字符 |
| search | `count` | 否 | 默认 10，范围 1~50 |
| search | `ori_question` | 否 | 1~128 字符，触发搜索的用户原始问题 |
| search | `localization` | 否 | IP 地址，优先返回本地化结果 |
| search | `need_content` | 否 | 默认 false，为 true 时返回网页正文 |
| fetch | `url` | 是 | <= 8192，含 host 的 HTTP/HTTPS URL，不能带用户名密码 |

## 模块职责

| 模块 | 职责 |
|------|------|
| `run.js` | 入口：加载 .env、分发命令、打印帮助、按错误类型设置退出码 |
| `lib/cli.js` | argv 解析（选项名归一化、单字母别名、布尔开关不吞下一个 token）与通用选项校验 |
| `lib/api.js` | 端点与默认常量、`deepseekRequest` 统一请求封装、`searchWeb` / `fetchPage`、key 读取与 `saveApiKey` 写盘 |
| `lib/env.js` | .env 文件路径解析（`--env-file` / 默认路径）、key 解析优先级、缺失 key 报错文案、`askForApiKey` 交互询问 |
| `lib/output.js` | 结果渲染：table / json / markdown，fetch 正文（`--raw` 只输出正文）、截断与显示宽度 |
| `lib/errors.js` | `makeError` / `printError` 与 `EXIT_CODES` 常量 |
| `lib/cmd/search.js` | search 命令：拼装 query 与请求字段、调用 API、格式化输出 |
| `lib/cmd/fetch.js` | fetch 命令：URL 校验、调用 API、`-o/--out` 写文件 |
| `lib/cmd/config.js` | config show / path / set-key（set-key 走 `saveApiKey` 写盘） |
| `lib/cmd/index.js` | 聚合导出各命令实现，供 run.js 引用 |

## 编码规范

- CommonJS（`require` / `module.exports`），禁用 ESM 与 TypeScript
- Node 18+ 全局 `fetch`，不引入任何运行时依赖（`node-fetch` 等一律不用）
- 命令函数永不抛异常，失败返回 `{ error, message }`，由 run.js 决定退出码
- 错误输出统一 `JSON.stringify({ error, message })`；成功输出支持 table / json / markdown 三种格式
- 注释、帮助文本、输出一律使用简体中文
- 新建文件小写下划线命名（多词），一个命令一个文件
- 版本号 `YYMMDD.HHmmSS` 由 build.js 通过 `define: { __VERSION }` 注入，不要手填

## Key 安全规则

- key 只能从环境变量或 `.env` 读取，解析优先级：`--api-key` > 环境变量 `DEEPSEEK_API_KEY` > `.env`
- `saveApiKey(baseDir, key)` 把 key 写入 `.env`，写入后尽力 `chmod 600`（Windows 等不支持平台忽略失败）
- 任何路径都不得打印完整 key：`config` 只显示掩码与来源，日志与错误信息同样只出现掩码
- `.env` 必须被 `.gitignore` 忽略；`.env.example` 只放占位符，禁止写真实 key
- 提交前扫描：`git diff --cached | grep -iE "sk-[A-Za-z0-9]{16,}|token|password"`

## 退出码

| 退出码 | 常量 | 含义 |
|--------|------|------|
| 0 | `EXIT_CODES.OK` | 成功 |
| 1 | `EXIT_CODES.API` | API 错误或运行时错误 |
| 2 | `EXIT_CODES.USAGE` | 用法错误（参数不合法） |
| 3 | `EXIT_CODES.NO_KEY` | 缺少 API Key（`--no-input` 下直接退出，不询问） |

HTTP 状态码对应的重试建议见 `SKILL.md` 的「输出与字段说明」。

## 新增命令的步骤

1. 在 `lib/cmd/` 新建 `<命令>.js`，导出 `cmdXxx(positionals, opts, ctx)`，失败返回 `{ error, message }`
2. 在 `lib/cmd/index.js` 中聚合导出
3. 在 `run.js` 的命令分发逻辑与 `showHelp()` 帮助文本中登记，并校验位置参数
4. 需要新选项时，在 `lib/cli.js` 的 `KNOWN_OPTIONS` / `SHORT_ALIASES` / `BOOLEAN_FLAGS` 中登记
5. 同步更新 `SKILL.md` 的命令总表 / 选项表与 `README.md` 的速查表
6. `npm run build` 后用 `node skill.js <命令>`（配合 `--dry-run` 与 `--no-input`）验证