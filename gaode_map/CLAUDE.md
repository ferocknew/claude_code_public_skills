# CLAUDE.md

## 项目概述

高德地图个人查询工具（Node.js 版），封装高德开放平台 Web 服务 API（v3 + v5），提供 14 个子命令。零运行时依赖，使用 Node.js 18+ 内置 `fetch`。

## 目录结构

```
gaode_map/
  SKILL.md        # LLM 使用文档
  CLAUDE.md       # 开发指引（本文件）
  run.js          # 源码入口（CLI 解析 + 命令分发）
  skill.js        # 打包产物（由 build.js 生成，无需安装依赖）
  build.js        # esbuild 打包脚本
  package.json    # 依赖配置（仅 esbuild devDep）
  .env            # API Key 配置（不提交到 git）
  .gitignore      # 忽略 .env 和 node_modules
  lib/            # 命令模块
    api.js        # HTTP 封装、API Key、版本号、.env 加载
    poi.js        # search/search2/around/around2
    geocode.js    # geo/regeo/locate
    route.js      # walk/drive/transit
    traffic.js    # traffic/trect/troad
    ip.js         # ip
  demo/           # Python 原版实现（参考用）
```

## 常用命令

```bash
pnpm install            # 安装构建依赖（仅 esbuild）
node run.js <command>   # 开发模式运行
npm run build           # 打包 run.js + lib/* -> skill.js
node skill.js <command> # 运行打包版本
```

## 架构

`run.js` 为精简入口（约 150 行），仅负责：
1. 加载 `.env`（`loadDotEnv(__dirname)`）
2. CLI 参数解析（自定义 `parseOptions`，无外部依赖）
3. 命令分发表 `COMMANDS`（每个命令映射到 handler/参数校验）

业务逻辑拆分到 `lib/` 目录下 6 个模块，esbuild 打包时自动合并为单文件 `skill.js`。

## API 端点映射

| 命令 | 版本 | AMap 端点 |
|------|------|-----------|
| search | v3 | /v3/place/text |
| search2 | v5 | /v5/place/text |
| around | v3 | /v3/place/around |
| around2 | v5 | /v5/place/around |
| geo | v3 | /v3/geocode/geo |
| regeo | v3 | /v3/geocode/regeo |
| ip | v3 | /v3/ip |
| walk | v3 | /v3/direction/walking |
| drive | v3 | /v3/direction/driving |
| transit | v3 | /v3/direction/transit/integrated |
| locate | v3 | /v3/geocode/geo |
| traffic | v3 | /v3/traffic/status/circle |
| trect | v3 | /v3/traffic/status/rectangle |
| troad | v3 | /v3/traffic/status/road |

## 开发规范

- **错误处理**：所有命令函数永不抛异常，返回 `{ error, message }` 结构
- **输出格式**：`console.log(JSON.stringify(result, null, 2))` 统一输出
- **版本号**：`YYMMDD.HHmmSS` 时间戳格式，由 build.js 自动生成
- **零运行时依赖**：不引入任何 npm 运行时包，仅使用 Node.js 内置 `fetch`
- **.env 加载**：`loadDotEnv(baseDir)` 接受路径参数，由 `run.js` 传入 `__dirname`
- **新增命令**：在 `lib/` 对应模块中添加函数，在 `run.js` 的 `COMMANDS` 表中注册
