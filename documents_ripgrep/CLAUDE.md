# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 文档说明

本项目包含 3 个核心文档，各自有不同的功能定位：

| 文件 | 功能定位 | 目标读者 |
|------|----------|----------|
| **SKILL.md** | 告诉 LLM 如何使用这个 skill | Claude AI (LLM) |
| **CLAUDE.md** | AI 开发工具的指引，包含项目架构和开发规范 | Claude Code (开发助手) |
| **README.md** | skill 的完整使用说明文档 | 用户 |

---

## 项目概述

这是一个基于 ripgrep 和 textract 的文档内容搜索工具，用于在大量文档中搜索特定内容。核心特点是通过结合 ripgrep 的高效文本搜索和 textract 的 Office 文件提取能力，实现全面的文档内容检索。

### 核心功能

- 文本文件搜索（使用 ripgrep）
- Office 文件搜索（.docx, .xlsx, .pptx）
- 支持正则表达式、大小写敏感、全词匹配等选项
- JSON 格式输出（ripgrep 原生支持）

---

## 常用命令

### 安装依赖
```bash
pnpm install
```

### 运行主工具
```bash
# 基本搜索
node run.js <目录路径> <搜索关键词>

# 正则表达式
node run.js <目录路径> <正则表达式> -e

# 打包
pnpm build
```

---

## 核心架构

### 主入口文件
- `run.js` - 主脚本，包含搜索逻辑和结果输出

### 搜索流程

**文本文件搜索：**
1. 构建 ripgrep 命令参数
2. 执行 ripgrep 搜索
3. 解析 JSON 输出
4. 收集匹配结果

**Office 文件搜索：**
1. 遍历目录收集 Office 文件
2. 使用 textract 提取文本内容
3. 在提取的文本中搜索关键词
4. 收集匹配结果

### 依赖加载方式
项目支持两种依赖加载方式：
1. **npx 模式**（推荐用于 textract）：`npx -y textract "文件路径"`
2. **本地安装模式**：`npm install` 后使用打包版本

---

## 开发规范

### 代码风格
1. 使用同步 API 简化代码（execSync）
2. 使用 JSON 格式解析 ripgrep 输出
3. 支持 Windows/macOS/Linux 跨平台

### 版本号规则
**打包文件版本号格式：YYMMDD.HHmmSS**
- 由 `build.js` 自动生成并注入到打包文件
- 同时更新 SKILL.md 中的 `version` 字段

---

## 重要限制

1. **Office 格式**：仅支持新版格式（.docx, .xlsx, .pptx）
2. **大文件**：超大 Office 文件可能需要较长处理时间
3. **内存**：使用 execSync 的 maxBuffer 限制输出大小
4. **超时**：textract 提取设置 30 秒超时

---

## 工具文件说明

| 文件 | 说明 |
|------|------|
| **skill.js** | 主工具，包含所有依赖，无需安装 |
| **run.js** | 开发版本，需要本地安装依赖 |
