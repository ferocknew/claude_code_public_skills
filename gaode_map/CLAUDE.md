# CLAUDE.md

## 项目概述

高德地图个人查询工具（Node.js 版），封装高德开放平台 Web 服务 API v3，提供 9 个子命令：search/around/geo/regeo/ip/walk/drive/transit/map。零运行时依赖，使用 Node.js 18+ 内置 `fetch`。

## 目录结构

```
gaode_map/
  SKILL.md        # LLM 使用文档
  CLAUDE.md       # 开发指引（本文件）
  run.js          # 源码入口
  skill.js        # 打包产物（由 build.js 生成）
  build.js        # esbuild 打包脚本
  package.json    # 依赖配置
  demo/           # Python 原版实现（参考用）
```

## 常用命令

```bash
pnpm install          # 安装构建依赖（仅 esbuild）
node run.js <command> # 开发模式运行
npm run build         # 打包 run.js -> skill.js
node skill.js <command> # 运行打包版本
```

## 架构

`run.js` 分为 6 个部分：
1. 常量和版本注入（`__VERSION` 由 build.js 通过 esbuild define 注入）
2. API Key 检查（`AMAP_API_KEY` 环境变量）
3. HTTP 封装（`amapGet`/`amapPost`，基于 fetch，15s 超时）
4. 9 个命令处理函数（每个对应一个 AMap API 端点）
5. CLI 解析（自定义 `parseOptions`，无外部依赖）
6. 主入口（switch 分发命令）

## API 端点映射

| 命令 | HTTP 方法 | AMap 端点 |
|------|-----------|-----------|
| search | GET | /v3/place/text |
| around | GET | /v3/place/around |
| geo | GET | /v3/geocode/geo |
| regeo | GET | /v3/geocode/regeo |
| ip | GET | /v3/ip |
| walk | GET | /v3/direction/walking |
| drive | GET | /v3/direction/driving |
| transit | GET | /v3/direction/transit/integrated |
| map | POST | /rest/wia/mcp/schema |

## 开发规范

- **错误处理**：所有命令函数永不抛异常，返回 `{ error, message }` 结构
- **输出格式**：`console.log(JSON.stringify(result, null, 2))` 统一输出
- **版本号**：`YYMMDD.HHmmSS` 时间戳格式，由 build.js 自动生成
- **零依赖**：不引入任何 npm 运行时包，仅使用 Node.js 内置 API
- **Python 参考**：`demo/personal-map/scripts/amap_personal_map_client.py` 是原始实现，保持 API 行为一致
