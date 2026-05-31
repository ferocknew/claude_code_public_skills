---
name: financial
description: 当用户需要查询金融行情、黄金/白银现货期货、A股实时行情、K线数据、新浪财经海外期货、财经新闻、同花顺股票新闻公告研报，或需要调用本地 financial_info_api 的 HTTP/MCP 接口时使用此 skill。
version: 260531.111546
---

# Financial Info API 查询

本 skill 用于调用本地 `financial_info_api` 服务，查询金融行情与资讯数据。默认使用实际注册的 `/api/v1/mcp` 接口，并通过 Bearer Token 认证。

## 配置

服务地址默认是 `http://localhost:8000`。可通过环境变量或命令行覆盖：

```bash
FINANCIAL_MCP_URL=https://example/mcp
FINANCIAL_MCP_TOKEN=YOUR_MCP_API_KEY
```

会自动读取 skill 同目录的 `.env` 文件，也支持读取 `FINANCIAL_API_BASE_URL`、`FINANCIAL_API_TOKEN`、`MCP_API_KEY` 等环境变量。`FINANCIAL_MCP_URL` 如果以 `/mcp` 结尾，会自动推导 API 根地址。请求默认 30 秒超时，可用 `FINANCIAL_API_TIMEOUT_MS` 或 `--timeout` 调整。

## 运行方式

```bash
# 接口说明
node skill.js info

# 黄金/股票实时行情，自动识别代码
node skill.js quote AU9999
node skill.js quote 600519

# 历史行情与 K 线
node skill.js history AU9999 --limit 100
node skill.js kline AU9999 --type day --days 30
node skill.js kline 600519 --type day --days 30 --force-refresh

# 新浪财经海外期货与综合行情
node skill.js sina-futures GC
node skill.js sina-comprehensive "hf_GC,sh000001,fx_susdcny"
node skill.js sina-codes

# 财经新闻
node skill.js news-stock --symbol au9999 --num 10
node skill.js news-weibo --plugin futures --num 20

# 同花顺股票数据
node skill.js ths-quote 300033
node skill.js ths-kline 300033 --period day --limit 100
node skill.js ths-timeshare 300033
node skill.js ths-news 300033 --limit 10
node skill.js ths-announcements 300033 --limit 10
node skill.js ths-reports 300033 --limit 10
node skill.js ths-industry-news 300033 --limit 10
```

需要临时覆盖配置时：

```bash
node skill.js quote AU9999 --base-url "http://127.0.0.1:8000" --token "YOUR_TOKEN"
```

## 命令速查

| 命令 | 用途 |
|------|------|
| `info` | 查看 MCP 接口说明 |
| `quote <code>` | 获取实时行情，支持 `AU9999`、`AG9999`、`600519`、`002594` 等 |
| `history <code>` | 获取黄金期货/现货历史行情 |
| `kline <code>` | 获取黄金期货/现货或股票 K 线 |
| `sina-futures <symbol>` | 获取海外期货实时行情，如 `GC`、`SI`、`CL` |
| `sina-comprehensive <symbols>` | 获取综合行情，逗号分隔，如 `hf_GC,sh000001` |
| `sina-codes` | 查看新浪财经支持的代码列表 |
| `news-stock` | 获取新浪财经正规媒体新闻 |
| `news-weibo` | 获取微博财经聚合内容 |
| `ths-quote <code>` | 获取同花顺股票实时行情 |
| `ths-kline <code>` | 获取同花顺股票 K 线 |
| `ths-timeshare <code>` | 获取同花顺股票分时图 |
| `ths-news <code>` | 获取公司新闻 |
| `ths-announcements <code>` | 获取公司公告 |
| `ths-reports <code>` | 获取研究报告 |
| `ths-industry-news <code>` | 获取行业资讯 |

## 代码规则

- 黄金/白银类：`AU9999`、`AG9999`、`AUTD`、`SHAU` 等。
- A股股票：6 位数字，如 `600519`、`002594`、`300750`。
- 新浪海外期货：`GC` 纽约黄金、`SI` 纽约白银、`CL` 美原油、`HG` 美铜、`NG` 天然气。
- 综合行情：使用新浪前缀，如 `hf_GC`、`sh000001`、`sz399001`、`fx_susdcny`。

## 注意事项

- 所有 `/api/v1/mcp` 接口都需要 Bearer Token。
- 当前 `financial_info_api/www.py` 中普通行情路由被注释，优先使用本 skill 封装的 MCP 路由。
- 股票 K 线默认使用缓存策略；需要等待最新数据时添加 `--force-refresh`。
- 黄金 K 线需要强制同步时添加 `--force-sync`。
- 默认输出格式化 JSON；需要紧凑 JSON 时添加 `--raw`。
