# smb-client (SMB / CIFS Client Tool)

SMB/CIFS 局域网共享客户端，既可作为 Agent Skill 单文件执行，也提供完整源码与构建工程。

## 功能

- 双引擎：优先调用系统 `smbclient`，未安装或执行失败时自动回退到打包好的纯 JS 引擎（`@marsaud/smb2`）。
- 命令：`test`、`ls`（支持 `--recursive`）、`stat`、`cat`、`get`、`put`、`mkdir`、`rm`、`rmdir`、`rename`、`shares`。
- 连接参数支持四种方式：独立选项、`--smb` 紧凑串、`smb://` URL、环境变量。
- `--json` 标准结构化输出，错误统一为 `{ success: false, error, code }`。

## 目录结构

- `src/index.js`：核心源码（CLI 解析、双引擎调度、smbclient 输出解析、纯 JS 引擎实现）
- `test_basic.js`：基础连通性与实例化测试脚本
- `build.js`：esbuild 打包脚本（生成单文件 `skill.js`，并回写 `SKILL.md` 版本号）
- `package.json`：项目依赖声明
- `SKILL.md`：Skill 规范文档与命令参数手册
- `skill.js`：开箱即用的预打包单文件产物

## 开发与构建

```bash
# 1. 安装依赖
npm install

# 2. 本地调试源码
node src/index.js --help

# 3. 打包生成单文件 skill.js（自动注入版本号并对齐 esbuild 动态 require）
node build.js

# 4. 验证
node skill.js --help
node skill.js shares --host smb.example.com --json
```

## 许可证

本项目内嵌打包了 [@marsaud/smb2](https://github.com/Node-SMB/marsaud-smb2)，遵循 MIT License。
