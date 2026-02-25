# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目概述

这是一个基于 Knex.js 的数据库客户端工具，用于连接和查询 MySQL、PostgreSQL、SQLite 数据库。核心特点是支持 **SSH 隧道**连接远程服务器上的数据库，以及**只读模式保护**。

### 核心功能

- 直接连接本地数据库（MySQL、PostgreSQL、SQLite）
- 通过 SSH 隧道连接远程数据库
- 执行原生 SQL 查询
- 使用 Knex Query Builder 构建查询
- 显示数据库概览（表列表、表结构）

### ⚠️ 只读模式限制

**本工具仅支持只读查询，禁止任何数据修改操作！**

- 允许：SELECT、SHOW、DESCRIBE、EXPLAIN、PRAGMA、WITH
- 禁止：INSERT、UPDATE、DELETE、CREATE、DROP、ALTER、TRUNCATE、REPLACE、GRANT、REVOKE

安全检查函数：`isReadOnlySQL(sql)` 在 `executeSQL()` 中被调用。

---

## 常用命令

### 安装依赖
```bash
cd db_client
pnpm install
```

### 运行主工具
```bash
# 直接连接
node run.js mysql host:localhost,port:3306,user:root,password:123,database:testdb

# SSH 隧道连接
node run.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:dbpass,database:testdb

# 查询
node run.js mysql host:localhost,user:root,password:123,database:testdb "SELECT * FROM users LIMIT 10"
```

### 打包
```bash
# 生成 skill.js（包含所有依赖，除了原生模块）
node build.js
```

---

## 核心架构

### 主入口文件
- `run.js` - 主脚本，支持直接连接和 SSH 隧道连接

### SSH 隧道实现

SSH 隧道通过 ssh2 库实现，核心流程：

1. **建立 SSH 连接**：使用 ssh2.Client 连接到 SSH 服务器
2. **创建本地服务器**：在本地随机端口（20000-30000）监听
3. **端口转发**：将本地端口的流量通过 SSH 转发到目标数据库
4. **连接数据库**：Knex 连接本地端口，实际访问远程数据库

```javascript
// 核心代码
function createSSHTunnel(sshParams, dbHost, dbPort) {
  return new Promise((resolve, reject) => {
    const ssh = new SSHClient();
    const forwardPort = 20000 + Math.floor(Math.random() * 10000);

    ssh.on("ready", () => {
      // 创建本地服务器
      const server = net.createServer((client) => {
        ssh.forwardOut("127.0.0.1", forwardPort, dbHost, dbPort, (err, stream) => {
          // 端口转发
          client.pipe(stream).pipe(client);
        });
      });

      server.listen(forwardPort, "127.0.0.1", () => {
        resolve({ ssh, server, localPort: forwardPort });
      });
    });

    ssh.connect(connConfig);
  });
}
```

### 原生模块处理

以下模块需要在运行时安装，无法被打包：
- `better-sqlite3` - SQLite 驱动
- `ssh2` - SSH 客户端

打包时通过 `external` 配置外部化这些模块。

### 数据库连接配置

```javascript
// MySQL
{
  client: "mysql2",
  connection: { host, port, user, password, database }
}

// PostgreSQL
{
  client: "pg",
  connection: { host, port, user, password, database }
}

// SQLite
{
  client: "better-sqlite3",
  connection: { filename: file }
}
```

---

## 开发规范

### 代码风格
1. 使用 async/await 处理异步操作
2. SSH 隧道使用完毕后必须关闭（`closeSSHTunnel`）
3. 数据库连接使用完毕后必须销毁（`db.destroy()`）
4. 使用 Promise 封装 SSH 隧道创建过程

### 命令行参数解析

参数格式：`key1:value1,key2:value2`

```javascript
function parseParams(paramStr) {
  const params = {};
  paramStr.split(",").forEach(pair => {
    const [key, ...valueParts] = pair.split(":");
    params[key] = valueParts.join(":"); // 处理值中包含冒号的情况
  });
  return params;
}
```

### 版本号规则
**打包文件版本号格式：YYMMDD.HHmmSS**
- 由 `build.js` 自动生成并注入到打包文件
- 同时更新 SKILL.md 中的 `version` 字段

---

## 安全注意事项

1. **密码安全**：不要在日志中输出密码
2. **SSH 密钥**：支持密码和私钥两种认证方式
3. **连接清理**：确保在异常情况下也能关闭 SSH 连接
4. **端口随机化**：本地端口随机生成，避免冲突

---

## 文件说明

| 文件 | 说明 |
|------|------|
| **skill.js** | 打包后的主工具（运行时需要 better-sqlite3 和 ssh2） |
| **run.js** | 开发环境主脚本（需要 pnpm install） |
| **build.js** | 打包脚本 |
