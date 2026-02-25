---
name: db_client
description: 当用户要求"连接数据库"、"查询 MySQL/PostgreSQL/SQLite"、"执行 SQL 查询"、"使用 Knex"、"数据库客户端"、"获取数据库数据"时，或者需要在 JavaScript/Node.js 环境中连接和操作关系型数据库时使用此 skill。
version: 260225.101103
---

# 数据库客户端 (DB Client)

本 skill 提供使用 Knex.js 连接和查询 MySQL、PostgreSQL、SQLite 数据库的完整指南。支持直接连接和 **SSH 隧道连接**远程服务器上的数据库。

## ⚠️ 重要：只读模式

**本工具仅支持只读查询，禁止任何数据修改操作！**

### 允许的操作（只读）
- ✅ `SELECT` - 数据查询
- ✅ `SHOW` - 显示数据库/表信息
- ✅ `DESCRIBE` / `DESC` - 显示表结构
- ✅ `EXPLAIN` - 查询执行计划
- ✅ `PRAGMA` - SQLite 编译指令
- ✅ `WITH` (CTE) - 公用表表达式

### 禁止的操作（会抛出错误）
- ❌ `INSERT` - 插入数据
- ❌ `UPDATE` - 更新数据
- ❌ `DELETE` - 删除数据
- ❌ `CREATE` - 创建表/数据库
- ❌ `DROP` - 删除表/数据库
- ❌ `ALTER` - 修改表结构
- ❌ `TRUNCATE` - 清空表
- ❌ `REPLACE` - 替换数据
- ❌ `GRANT` / `REVOKE` - 权限管理

---

## 概述

Knex (pronounced "connectness") 是一个用于 Node.js 的 SQL 查询构建器，支持 PostgreSQL、MySQL、SQLite 等多种数据库。它提供了流畅的链式 API 来构建和执行 SQL 查询。

**核心特性：**
- 支持 MySQL、PostgreSQL、SQLite
- 支持 SQL 查询和 Knex Query Builder
- **支持 SSH 隧道连接远程数据库**
- **只读模式保护 - 防止误操作**
- 防止 SQL 注入
- 跨平台兼容

## 运行方式

### 直接连接（本地数据库）

```bash
# 数据库概览（显示所有表）
node skill.js <数据库类型> <连接参数>

# 执行 SQL 查询
node skill.js <数据库类型> <连接参数> "SELECT * FROM users LIMIT 10"

# 使用 Knex Query Builder
node skill.js <数据库类型> <连接参数> --knex "table('users').select('*').limit(10)"
```

### SSH 隧道连接（远程数据库）

```bash
# 通过 SSH 隧道连接远程数据库
node skill.js <数据库类型> --ssh <SSH参数> --db <数据库参数> [查询]

# 示例：连接远程服务器上的 MySQL
node skill.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:dbpass,database:testdb
```

**连接参数格式：**

| 数据库类型 | 连接参数示例 |
|-----------|-------------|
| **MySQL** | `host:localhost,port:3306,user:root,password:123,database:testdb` |
| **PostgreSQL** | `host:localhost,port:5432,user:postgres,password:123,database:testdb` |
| **SQLite** | `file:/path/to/database.db` |

**SSH 隧道参数：**

| 参数 | 说明 | 示例 |
|------|------|------|
| `host` | SSH 服务器地址（必需） | `host:server.com` |
| `port` | SSH 端口（默认 22） | `port:22` |
| `user` | SSH 用户名（必需） | `user:ubuntu` |
| `password` | SSH 密码 | `password:mypass` |
| `privateKey` | SSH 私钥文件路径 | `privateKey:/path/to/key.pem` |
| `passphrase` | 私钥密码短语 | `passphrase:keypass` |

---

## 支持的数据库

| 数据库 | 说明 | 支持程度 |
|--------|------|----------|
| **MySQL** | MySQL/MariaDB | ✅ 完全支持 |
| **PostgreSQL** | PostgreSQL | ✅ 完全支持 |
| **SQLite** | SQLite3 | ✅ 完全支持 |

### 驱动依赖

| 数据库 | Node.js 驱动 |
|--------|-------------|
| MySQL | `mysql2` |
| PostgreSQL | `pg` |
| SQLite | `better-sqlite3` |

---

## 基本操作

### 连接数据库

```javascript
const knex = require('knex')({
  client: 'mysql', // 或 'pg' (PostgreSQL) 或 'better-sqlite3' (SQLite)
  connection: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'mydb'
  }
});

// SQLite 连接
const knex = require('knex')({
  client: 'better-sqlite3',
  connection: {
    filename: '/path/to/database.db'
  }
});
```

### 查询数据

```javascript
// SELECT * FROM users
const users = await knex('users').select('*');

// SELECT * FROM users WHERE id = 1
const user = await knex('users').where('id', 1).first();

// SELECT * FROM users WHERE age > 18 ORDER BY name LIMIT 10
const adults = await knex('users')
  .where('age', '>', 18)
  .orderBy('name')
  .limit(10);
```

### 插入数据

```javascript
// INSERT INTO users (name, email) VALUES ('John', 'john@example.com')
await knex('users').insert({
  name: 'John',
  email: 'john@example.com'
});

// 批量插入
await knex('users').insert([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' }
]);
```

### 更新数据

```javascript
// UPDATE users SET email = 'new@example.com' WHERE id = 1
await knex('users')
  .where('id', 1)
  .update({ email: 'new@example.com' });
```

### 删除数据

```javascript
// DELETE FROM users WHERE id = 1
await knex('users').where('id', 1).del();
```

---

## 命令行用法

### 通用格式

```bash
node skill.js <数据库类型> <连接参数> [查询/操作]
```

### MySQL 示例

```bash
# 连接并显示所有表
node skill.js mysql host:localhost,port:3306,user:root,password:123456,database:testdb

# 查询数据
node skill.js mysql host:localhost,port:3306,user:root,password:123456,database:testdb "SELECT * FROM users LIMIT 10"

# 使用 Knex Query Builder
node skill.js mysql host:localhost,port:3306,user:root,password:123456,database:testdb --knex "table('users').select('*').where('status', 'active')"
```

### PostgreSQL 示例

```bash
# 连接并显示所有表
node skill.js pg host:localhost,port:5432,user:postgres,password:123456,database:testdb

# 查询数据
node skill.js pg host:localhost,port:5432,user:postgres,password:123456,database:testdb "SELECT * FROM users LIMIT 10"
```

### SQLite 示例

```bash
# 连接并显示所有表
node skill.js sqlite file:/path/to/database.db

# 查询数据
node skill.js sqlite file:/path/to/database.db "SELECT * FROM users LIMIT 10"
```

---

## SSH 隧道连接

SSH 隧道允许你通过 SSH 服务器安全地访问远程数据库，无需在数据库服务器上开放公共端口。

### 为什么要使用 SSH 隧道？

- **安全性**：数据库服务器无需开放公网端口
- **防火墙友好**：只需开放 SSH 端口（通常为 22）
- **统一访问**：通过跳板机访问内网数据库

### SSH 隧道基本语法

```bash
node skill.js <数据库类型> --ssh <SSH参数> --db <数据库参数> [查询]
```

### 密码认证示例

```bash
# MySQL via SSH（密码认证）
node skill.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:dbpass,database:testdb

# PostgreSQL via SSH
node skill.js pg --ssh host:192.168.1.100,user:admin,password:secret --db host:localhost,port:5432,user:postgres,password:123,database:mydb

# 查询数据
node skill.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:dbpass,database:testdb "SELECT * FROM users LIMIT 10"
```

### 私钥认证示例

```bash
# MySQL via SSH（私钥认证）
node skill.js mysql --ssh host:server.com,user:ubuntu,privateKey:/path/to/key.pem --db host:localhost,port:3306,user:root,password:123,database:testdb

# 私钥 + 密码短语
node skill.js mysql --ssh host:server.com,user:ubuntu,privateKey:/path/to/key.pem,passphrase:keypass --db host:localhost,port:3306,user:root,password:123,database:testdb
```

### SSH 隧道参数详解

| 参数 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `host` | ✅ | SSH 服务器地址 | `host:server.com` |
| `port` | ❌ | SSH 端口，默认 22 | `port:2222` |
| `user` | ✅ | SSH 登录用户名 | `user:ubuntu` |
| `password` | ⚠️ | SSH 登录密码（与 privateKey 二选一） | `password:mypass` |
| `privateKey` | ⚠️ | 私钥文件路径（与 password 二选一） | `privateKey:/home/user/.ssh/id_rsa` |
| `passphrase` | ❌ | 私钥密码短语 | `passphrase:mykeypass` |

⚠️ **注意**：`password` 和 `privateKey` 必须提供其中一个。

### 数据库参数（SSH 模式）

在 SSH 隧道模式下，数据库连接参数中的 `host` 应该是**相对于 SSH 服务器的主机地址**：

```bash
# 远程服务器上的 MySQL（数据库和 SSH 在同一台机器）
node skill.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:dbpass,database:testdb

# 远程服务器上的 MySQL（数据库在内网另一台机器）
node skill.js mysql --ssh host:jump.server.com,user:ubuntu,password:sshpass --db host:192.168.1.50,port:3306,user:root,password:dbpass,database:testdb
```

### 完整示例

#### 场景 1：查询远程 MySQL 数据库的所有表

```bash
node skill.js mysql --ssh host:example.com,user:admin,password:sshpass123 --db host:localhost,port:3306,user:root,password:dbpass123,database:production
```

#### 场景 2：使用 Knex Query Builder 查询远程 PostgreSQL

```bash
node skill.js pg --ssh host:db-server.com,user:deploy,privateKey:/home/user/.ssh/deploy_key --db host:localhost,port:5432,user:postgres,password:pgpass,database:myapp --knex "table('users').select('*').where('active',true)"
```

#### 场景 3：执行原生 SQL 查询

```bash
node skill.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:dbpass,database:testdb "SELECT COUNT(*) as total FROM orders WHERE status = 'completed'"
```

### 工作原理

```
本地机器                    SSH 服务器                  数据库服务器
   |                          |                             |
   |-- node skill.js -------->|                             |
   |                          |-- SSH 隧道 ---------------->|
   |                          |     localhost:3306          |
   |<--------- 返回数据 ------------------------------------|
```

1. 工具在本地创建一个随机端口（如 23456）
2. 通过 SSH 连接到远程服务器
3. 建立 `本地端口 -> 远程数据库` 的隧道
4. 通过本地端口访问远程数据库

---

## Knex Query Builder 语法

### 基本查询

```javascript
// 选择所有列
knex('users').select('*')

// 选择特定列
knex('users').select('id', 'name', 'email')

// 别名
knex('users').select('id as user_id', 'name as full_name')
```

### WHERE 条件

```javascript
// 等于
knex('users').where('id', 1)

// 不等于
knex('users').where('status', '!=', 'inactive')

// 大于/小于
knex('users').where('age', '>', 18)

// 多条件 AND
knex('users').where({
  status: 'active',
  age: 18
})

// 多条件 OR
knex('users').where('age', '>', 18).orWhere('role', 'admin')

// IN 查询
knex('users').whereIn('id', [1, 2, 3])

// LIKE 查询
knex('users').where('name', 'like', '%John%')

// WHERE NOT
knex('users').whereNot('status', 'deleted')
```

### 排序和限制

```javascript
// 排序
knex('users').orderBy('created_at', 'desc')

// 限制数量
knex('users').limit(10)

// 跳过
knex('users').offset(10).limit(10)

// 分页
knex('users').limit(10).offset(20 * 10) // 第 20 页，每页 10 条
```

### 聚合函数

```javascript
// 计数
knex('users').count('* as total')

// 求和
knex('orders').sum('amount as total')

// 平均值
knex('products').avg('price as average_price')

// 最大值/最小值
knex('products').max('price as max_price')
knex('products').min('price as min_price')
```

### 分组

```javascript
// 单列分组
knex('orders')
  .select('user_id')
  .count('* as order_count')
  .groupBy('user_id')

// 多列分组
knex('orders')
  .select('user_id', 'status')
  .count('* as total')
  .groupBy('user_id', 'status')
```

### JOIN

```javascript
// INNER JOIN
knex('users')
  .join('orders', 'users.id', 'orders.user_id')
  .select('users.*', 'orders.id as order_id')

// LEFT JOIN
knex('users')
  .leftJoin('orders', 'users.id', 'orders.user_id')
  .select('users.*', 'orders.id as order_id')

// 多条件 JOIN
knex('users')
  .join('orders', function() {
    this.on('users.id', '=', 'orders.user_id')
        .andOn('orders.status', '=', 'active')
  })
```

---

## 原生 SQL 查询

```bash
# 执行原生 SQL
node skill.js mysql host:localhost,port:3306,user:root,password:123,database:testdb "SELECT * FROM users WHERE age > 18"

# 带参数的查询
node skill.js mysql host:localhost,port:3306,user:root,password:123,database:testdb "SELECT * FROM users WHERE id = ?" --params 1

# 多参数查询
node skill.js mysql host:localhost,port:3306,user:root,password:123,database:testdb "SELECT * FROM users WHERE age > ? AND status = ?" --params 18 active
```

---

## 常见用法示例

### 用户管理

```bash
# 查询所有活跃用户
node skill.js mysql host:localhost,user:root,password:123,database:myapp --knex "table('users').select('*').where('status', 'active')"

# 查询用户总数
node skill.js mysql host:localhost,user:root,password:123,database:myapp --knex "table('users').count('* as total')"

# 分页查询用户
node skill.js mysql host:localhost,user:root,password:123,database:myapp --knex "table('users').select('*').orderBy('created_at', 'desc').limit(20).offset(0)"
```

### 数据统计

```bash
# 按状态分组统计
node skill.js mysql host:localhost,user:root,password:123,database:myapp --knex "table('orders').select('status').count('* as total').groupBy('status')"

# 计算总销售额
node skill.js mysql host:localhost,user:root,password:123,database:myapp --knex "table('orders').sum('amount as total_sales')"
```

### 关联查询

```bash
# 用户及其订单
node skill.js mysql host:localhost,user:root,password:123,database:myapp --knex "table('users').join('orders', 'users.id', 'orders.user_id').select('users.name', 'orders.*').limit(10)"
```

---

## 限制与注意事项

### 优势

- ✅ 支持多种数据库（MySQL、PostgreSQL、SQLite）
- ✅ 链式 API，易读易写
- ✅ 防止 SQL 注入
- ✅ 支持 Promise/async-await
- ✅ 跨平台兼容
- ✅ **只读保护 - 防止误操作修改数据**

### 限制

- ❌ **仅支持只读查询**：禁止 INSERT/UPDATE/DELETE/CREATE/DROP/ALTER 等修改操作
- 不支持 NoSQL 数据库（如 MongoDB）
- 复杂查询可能需要使用原生 SQL
- 某些数据库特定功能可能无法通过 Query Builder 使用
- SQLite 和 SSH 隧道需要原生模块支持（better-sqlite3、ssh2）

---

## 快速开始

```bash
# 显示数据库所有表
node skill.js mysql host:localhost,port:3306,user:root,password:123456,database:testdb

# 查询表数据
node skill.js mysql host:localhost,port:3306,user:root,password:123456,database:testdb "SELECT * FROM users LIMIT 10"
```

---

## 安全提示

1. **只读模式** - 本工具仅支持只读查询，任何数据修改操作（INSERT/UPDATE/DELETE 等）都会被拒绝
2. **不要在命令行中明文输入敏感密码** - 建议使用配置文件或环境变量
3. **限制查询结果数量** - 使用 LIMIT 避免返回过多数据
4. **SSH 密钥安全** - 私钥文件应设置适当的权限（如 600）
5. **生产环境** - 建议使用只读数据库账号进行查询
