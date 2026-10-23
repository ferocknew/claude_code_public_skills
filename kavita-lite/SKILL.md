---
name: kavita-lite
description: 当用户需要"抓取豆瓣图书信息"、"获取图书简介与封面"、"豆瓣刮削"、"Kavita 自动刮削/回填"、"补齐 Kavita 书籍元数据"时使用此 skill。通过 Node.js 原生 fetch 抓取豆瓣图书的结构化元数据（书名、简介、作者、出版社、ISBN、评分、标签、高清大封面），并支持通过 Kavita REST API 自动将元数据与封面写回自托管 Kavita 实例中。零 npm 依赖，开箱即用。
version: 1.0.0
skill_version: 261021.160500
---

# Kavita Lite（豆瓣图书刮削与 Kavita 元数据回填 Skill）

基于 Node.js 18+ 原生能力构建的轻量级图书刮削与 Kavita 回填工具。**零第三方 npm 依赖**（无需 `npm install`），开箱即用。

## 🌟 核心特性

- 📚 **豆瓣双模抓取**：支持通过豆瓣图书搜索接口快速联想，或精准解析豆瓣详情页（HTML）提取完整长简介、目录、作者、出版社、出版年、ISBN、评分及热门标签。
- 🎨 **原版高清大封面**：自动提取豆瓣原版高清封面大图，并转成符合 Kavita 接口规范的 Base64 自动上传。
- ⚡ **Kavita 自动回填**：如果 `.env` 或环境变量配置了 `KAVITA_URL` 与 `KAVITA_API_KEY`，可直接一键将元数据与封面上传并锁定到指定的 Kavita Series 中。
- 🔒 **优雅降级**：如果不配置 Kavita 信息，也可以作为独立的豆瓣图书 CLI 查询与抓取工具使用。

## ⚙️ 配置说明 (.env)

在 skill 目录下配置 `.env` 文件（或通过环境变量提供）：

```env
# Kavita 服务地址与 API 密钥（可选，需回填时必填）
KAVITA_URL=http://your-kavita-host:5000
KAVITA_API_KEY=your_kavita_api_key_here

# 豆瓣 Cookie（可选，若频繁请求遇到防爬可填入浏览器 Cookie）
# DOUBAN_COOKIE=
```

## 📖 常用命令总表

| 命令 | 用途 | 示例 |
|---|---|---|
| `search <关键词>` | 在豆瓣搜索图书，返回候选列表、豆瓣ID与封面链接 | `node skill.js search "西游记"` |
| `get <豆瓣ID或书名>` | 抓取图书的完整简介、作者、ISBN、标签及高清封面 | `node skill.js get 1029553` |
| `sync <Kavita书名或ID> [豆瓣ID]` | 抓取豆瓣并自动回填写入 Kavita 对应书目中 | `node skill.js sync "西游记"` |
| `kavita-list [LibraryId]` | 查看 Kavita 书库中藏书的简介与元数据完备情况 | `node skill.js kavita-list 8` |
