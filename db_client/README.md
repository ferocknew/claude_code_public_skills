# 数据库客户端 (DB Client)

基于 Knex.js 的通用数据库客户端，支持 MySQL、PostgreSQL、SQLite，以及通过 SSH 隧道连接远程数据库。

## ⚠️ 只读模式

**本工具仅支持只读查询，禁止任何数据修改操作！**

### 允许的操作
- ✅ SELECT、SHOW、DESCRIBE、EXPLAIN、PRAGMA、WITH

### 禁止的操作
- ❌ INSERT、UPDATE、DELETE、CREATE、DROP、ALTER、TRUNCATE、REPLACE、GRANT、REVOKE

## 功能特性

- 支持 MySQL、PostgreSQL、SQLite
- 原生 SQL 查询
- Knex Query Builder 链式查询
- SSH 隧道连接远程数据库
- 数据库概览（表列表、表结构）
- 防止 SQL 注入
- **只读模式保护 - 防止误操作修改数据**

## 安装

```bash
cd db_client
pnpm install
```

## 快速开始

### 直接连接本地数据库

```bash
# MySQL - 显示所有表
node run.js mysql host:localhost,port:3306,user:root,password:123456,database:testdb

# PostgreSQL - 查询数据
node run.js pg host:localhost,port:5432,user:postgres,password:123456,database:testdb "SELECT * FROM users LIMIT 10"

# SQLite
node run.js sqlite file:/path/to/database.db
```

### 通过 SSH 隧道连接远程数据库

```bash
# MySQL via SSH（密码认证）
node run.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:dbpass,database:testdb

# MySQL via SSH（私钥认证）
node run.js mysql --ssh host:server.com,user:ubuntu,privateKey:/path/to/key.pem --db host:localhost,port:3306,user:root,password:123,database:testdb
```

## 使用方法

### 命令行格式

```bash
# 直接连接
node run.js <数据库类型> <连接参数> [查询]

# SSH 隧道连接
node run.js <数据库类型> --ssh <SSH参数> --db <数据库参数> [查询]
```

### 连接参数格式

参数格式为 `key1:value1,key2:value2`，用逗号分隔多个参数。

#### MySQL 连接参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| host | 主机地址 | localhost |
| port | 端口 | 3306 |
| user | 用户名 | - |
| password | 密码 | - |
| database | 数据库名 | - |

#### PostgreSQL 连接参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| host | 主机地址 | localhost |
| port | 端口 | 5432 |
| user | 用户名 | - |
| password | 密码 | - |
| database | 数据库名 | - |

#### SQLite 连接参数

| 参数 | 说明 |
|------|------|
| file | 数据库文件路径 |

#### SSH 隧道参数

| 参数 | 说明 | 必需 |
|------|------|------|
| host | SSH 服务器地址 | 是 |
| port | SSH 端口 | 否（默认 22） |
| user | SSH 用户名 | 是 |
| password | SSH 密码 | 与 privateKey 二选一 |
| privateKey | 私钥文件路径 | 与 password 二选一 |
| passphrase | 私钥密码短语 | 否 |

## 查询方式

### 1. 原生 SQL 查询

```bash
node run.js mysql host:localhost,user:root,password:123,database:testdb "SELECT * FROM users WHERE age > 18"
```

### 2. Knex Query Builder

```bash
node run.js mysql host:localhost,user:root,password:123,database:testdb --knex "table('users').select('*').where('status','active')"
```

支持的 Knex 方法：
- `.select()`
- `.where()`
- `.whereIn()`
- `.orderBy()`
- `.limit()`
- `.offset()`
- `.count()`
- `.sum()`
- `.avg()`
- `.join()`

### 3. 数据库概览（无查询参数）

```bash
node run.js mysql host:localhost,user:root,password:123,database:testdb
```

输出：
- 所有表列表
- 第一个表的列结构

## 打包

```bash
node build.js
```

打包后生成 `skill.js`，可直接运行：

```bash
node skill.js mysql host:localhost,user:root,password:123,database:testdb
```

**注意**：打包后的文件仍然需要在运行环境中安装以下原生模块：
- `better-sqlite3`（用于 SQLite）
- `ssh2`（用于 SSH 隧道）

## 示例

### 场景 1：查询远程 MySQL 数据库

```bash
node run.js mysql \
  --ssh host:example.com,user:ubuntu,password:sshpass123 \
  --db host:localhost,port:3306,user:root,password:dbpass123,database:production \
  "SELECT COUNT(*) FROM orders"
```

### 场景 2：分页查询

```bash
node run.js pg host:localhost,user:postgres,password:123,database:myapp \
  "SELECT * FROM users ORDER BY created_at DESC LIMIT 20 OFFSET 0"
```

### 场景 3：统计查询

```bash
node run.js mysql host:localhost,user:root,password:123,database:myapp \
  --knex "table('orders').select('status').count('* as total').groupBy('status')"
```

## 限制

- ❌ **仅支持只读查询**：禁止 INSERT/UPDATE/DELETE/CREATE/DROP/ALTER 等修改操作
- 不支持 NoSQL 数据库（如 MongoDB）
- SQLite 和 SSH 隧道需要原生模块支持
- 复杂查询建议使用原生 SQL

## 依赖

| 库 | 用途 |
|------|------|
| knex | SQL 查询构建器 |
| mysql2 | MySQL 驱动 |
| pg | PostgreSQL 驱动 |
| better-sqlite3 | SQLite 驱动 |
| ssh2 | SSH 客户端 |

## 许可

MIT
