#!/usr/bin/env node
/**
 * 数据库通用客户端（支持 MySQL、PostgreSQL、SQLite + SSH 隧道）
 *
 * 用法:
 *   直接连接:
 *     node skill.js <数据库类型> <连接参数> [查询]
 *
 *   SSH 隧道连接:
 *     node skill.js <数据库类型> --ssh <SSH参数> --db <数据库参数> [查询]
 *
 * 作者: Claude Code
 * 版本: 1.0.0
 */

const knex = require("knex");
const { Client: SSHClient } = require("ssh2");
const net = require("net");

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

// 解析键值对参数
function parseParams(paramStr) {
  if (!paramStr) return {};
  const params = {};
  paramStr.split(",").forEach(pair => {
    const [key, ...valueParts] = pair.split(":");
    if (key && valueParts.length > 0) {
      params[key] = valueParts.join(":");
    }
  });
  return params;
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);

  let dbType = null;
  let sshParams = null;
  let dbParams = null;
  let query = null;
  let isKnexMode = false;
  let knexQuery = null;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--ssh") {
      sshParams = parseParams(args[++i]);
    } else if (arg === "--db") {
      dbParams = parseParams(args[++i]);
    } else if (arg === "--knex") {
      isKnexMode = true;
      knexQuery = args[++i];
    } else if (arg === "-h" || arg === "--help") {
      showHelp();
      process.exit(0);
    } else if (arg === "-v" || arg === "--version") {
      showVersion();
      process.exit(0);
    } else if (!dbType) {
      dbType = arg;
    } else if (arg.startsWith("--") || arg.includes(":")) {
      // 可能是连接参数（如果没有用 --ssh 或 --db）
      if (!dbParams) {
        dbParams = parseParams(arg);
      } else {
        query = arg;
      }
    } else {
      query = arg;
    }
    i++;
  }

  return { dbType, sshParams, dbParams, query, isKnexMode, knexQuery };
}

// 显示帮助
function showHelp() {
  console.log(`
数据库通用客户端 v${SKILL_VERSION}

用法:

  【直接连接】
  node skill.js <数据库类型> <连接参数> [查询]

  【SSH 隧道连接】
  node skill.js <数据库类型> --ssh <SSH参数> --db <数据库参数> [查询]

数据库类型:
  mysql    - MySQL/MariaDB
  pg       - PostgreSQL
  sqlite   - SQLite3

连接参数格式:
  key1:value1,key2:value2,key3:value3

  MySQL 连接参数:
    host     - 主机地址 (默认: localhost)
    port     - 端口 (默认: 3306)
    user     - 用户名
    password - 密码
    database - 数据库名

  PostgreSQL 连接参数:
    host     - 主机地址 (默认: localhost)
    port     - 端口 (默认: 5432)
    user     - 用户名
    password - 密码
    database - 数据库名

  SQLite 连接参数:
    file     - 数据库文件路径

  SSH 隧道参数:
    host     - SSH 服务器地址 (必需)
    port     - SSH 端口 (默认: 22)
    user     - SSH 用户名 (必需)
    password  - SSH 密码 (与 privateKey 二选一)
    privateKey - SSH 私钥文件路径 (与 password 二选一)
    passphrase  - 私钥密码短语 (可选)

查询选项:
  --knex <表达式>  使用 Knex Query Builder 语法

示例:

  【MySQL 直接连接】
  # 显示所有表
  node skill.js mysql host:localhost,port:3306,user:root,password:123,database:testdb

  # SQL 查询
  node skill.js mysql host:localhost,user:root,password:123,database:testdb "SELECT * FROM users LIMIT 10"

  # Knex 查询
  node skill.js mysql host:localhost,user:root,password:123,database:testdb --knex "table('users').select('*').where('status','active')"

  【PostgreSQL 直接连接】
  node skill.js pg host:localhost,port:5432,user:postgres,password:123,database:testdb "SELECT * FROM users LIMIT 10"

  【SQLite 直接连接】
  node skill.js sqlite file:/path/to/database.db "SELECT * FROM users LIMIT 10"

  【通过 SSH 隧道连接远程数据库】
  # MySQL via SSH
  node skill.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:dbpass,database:testdb

  # PostgreSQL via SSH
  node skill.js pg --ssh host:server.com,user:ubuntu --db host:localhost,port:5432,user:postgres,password:123,database:testdb

  # 使用私钥认证
  node skill.js mysql --ssh host:server.com,user:ubuntu,privateKey:/path/to/key.pem --db host:localhost,port:3306,user:root,password:123,database:testdb

快捷选项:
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息
`);
}

// 显示版本
function showVersion() {
  console.log(`数据库通用客户端 v${SKILL_VERSION}`);
  console.log("基于 Knex.js + SSH2");
}

// 构建 Knex 配置
function buildKnexConfig(dbType, dbParams, localPort = null) {
  const config = {
    client: dbType === "pg" ? "pg" :
             dbType === "sqlite" ? "better-sqlite3" : "mysql2",
    // 设置为只读模式
    asyncStackTraces: false,
    debug: process.env.DEBUG === "1",
  };

  if (dbType === "sqlite") {
    config.connection = { filename: dbParams.file };
  } else {
    config.connection = {
      host: localPort ? "127.0.0.1" : (dbParams.host || "localhost"),
      port: localPort || parseInt(dbParams.port || (dbType === "pg" ? 5432 : 3306)),
      user: dbParams.user,
      password: dbParams.password,
      database: dbParams.database,
    };
    // 连接池配置 - 简化配置避免连接问题
    config.pool = { min: 0, max: 1 };
  }

  return config;
}

// 创建 SSH 隧道
function createSSHTunnel(sshParams, dbHost, dbPort) {
  return new Promise((resolve, reject) => {
    const ssh = new SSHClient();
    const forwardPort = 20000 + Math.floor(Math.random() * 10000);
    let server = null;

    ssh.on("ready", () => {
      console.log(`✓ SSH 连接成功: ${sshParams.user}@${sshParams.host}`);

      // 创建本地服务器监听随机端口
      server = net.createServer((client) => {
        ssh.forwardOut("127.0.0.1", forwardPort, dbHost, dbPort, (err, stream) => {
          if (err) {
            client.end();
            return;
          }
          client.pipe(stream).pipe(client);
        });
      });

      server.listen(forwardPort, "127.0.0.1", () => {
        console.log(`✓ SSH 隧道建立: 127.0.0.1:${forwardPort} -> ${dbHost}:${dbPort}`);
        resolve({ ssh, server, localPort: forwardPort });
      });
    });

    ssh.on("error", (err) => {
      reject(new Error(`SSH 连接失败: ${err.message}`));
    });

    const connConfig = {
      host: sshParams.host,
      port: parseInt(sshParams.port || 22),
      username: sshParams.user,
    };

    if (sshParams.password) {
      connConfig.password = sshParams.password;
    } else if (sshParams.privateKey) {
      const fs = require("fs");
      try {
        connConfig.privateKey = fs.readFileSync(sshParams.privateKey);
      } catch (err) {
        reject(new Error(`无法读取私钥文件: ${sshParams.privateKey}`));
        return;
      }
      if (sshParams.passphrase) {
        connConfig.passphrase = sshParams.passphrase;
      }
    } else {
      reject(new Error("SSH 需要提供 password 或 privateKey"));
      return;
    }

    ssh.connect(connConfig);
  });
}

// 关闭 SSH 隧道
function closeSSHTunnel(tunnel) {
  if (tunnel) {
    if (tunnel.server) tunnel.server.close();
    if (tunnel.ssh) tunnel.ssh.end();
  }
}

// 显示数据库概览
async function showDatabaseOverview(db) {
  console.log("\n📊 数据库概览\n");

  try {
    // 获取所有表
    let tables = [];

    if (db.client.config.client === "pg") {
      const result = await db.raw(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      tables = result.rows.map(r => r.table_name);
    } else if (db.client.config.client === "mysql2") {
      const result = await db.raw("SHOW TABLES");
      tables = Object.values(result[0]).map(row => Object.values(row)[0]);
    } else if (db.client.config.client === "better-sqlite3") {
      const result = await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
      tables = result.map(r => r.name);
    }

    console.log(`📋 共 ${tables.length} 个表:\n`);
    tables.forEach((table, i) => {
      console.log(`  ${i + 1}. ${table}`);
    });

    // 显示第一个表的结构
    if (tables.length > 0) {
      const firstTable = tables[0];
      console.log(`\n📋 表结构: ${firstTable}\n`);

      let columns = [];

      if (db.client.config.client === "pg") {
        const result = await db.raw(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = '${firstTable}'
          ORDER BY ordinal_position
        `);
        columns = result.rows;
      } else if (db.client.config.client === "mysql2") {
        const result = await db.raw(`DESCRIBE ${firstTable}`);
        columns = result[0].map(row => ({
          column_name: row.Field,
          data_type: row.Type,
          is_nullable: row.Null === "YES" ? "YES" : "NO",
        }));
      } else if (db.client.config.client === "better-sqlite3") {
        const result = await db.raw(`PRAGMA table_info(${firstTable})`);
        columns = result.map(row => ({
          column_name: row.name,
          data_type: row.type,
          is_nullable: row.notnull === 0 ? "YES" : "NO",
        }));
      }

      console.log("  列名              | 类型           | 可空");
      console.log("  " + "─".repeat(50));
      columns.forEach(col => {
        const name = (col.column_name || "").padEnd(16);
        const type = (col.data_type || "").padEnd(13);
        const nullable = col.is_nullable || "NO";
        console.log(`  ${name} | ${type} | ${nullable}`);
      });
    }

  } catch (err) {
    console.log(`⚠ 无法获取表信息: ${err.message}`);
  }
}

// SQL 安全检查 - 只允许只读查询
function isReadOnlySQL(sql) {
  const upper = sql.trim().toUpperCase();

  // 检查是否以 SELECT 开头或其他只读语句
  const readOnlyPrefixes = ["SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN", "WITH", "PRAGMA"];
  const startsWithReadOnly = readOnlyPrefixes.some(prefix => upper.startsWith(prefix));

  if (!startsWithReadOnly) {
    return false;
  }

  // 检查是否包含危险的修改操作
  const dangerousPatterns = [
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+\w+\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bDROP\s+(TABLE|DATABASE|INDEX)\b/i,
    /\bCREATE\s+(TABLE|DATABASE|INDEX)\b/i,
    /\bALTER\s+(TABLE|DATABASE)\b/i,
    /\bTRUNCATE\s+TABLE\b/i,
    /\bREPLACE\s+INTO\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      return false;
    }
  }

  return true;
}

// 执行 SQL 查询（只读模式）
async function executeSQL(db, query) {
  console.log(`\n🔍 执行 SQL 查询:\n  ${query}\n`);

  // 安全检查
  if (!isReadOnlySQL(query)) {
    throw new Error(
      "❌ 数据安全保护\n\n" +
      "此工具仅支持只读查询！\n" +
      "禁止的操作: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, REPLACE, GRANT, REVOKE\n" +
      "允许的操作: SELECT, SHOW, DESCRIBE, EXPLAIN, PRAGMA"
    );
  }

  const result = await db.raw(query);
  return result;
}

// 执行 Knex 查询
async function executeKnex(db, knexExpr) {
  console.log(`\n🔍 执行 Knex 查询:\n  ${knexExpr}\n`);

  // 构建查询链
  let query = db;
  const matches = knexExpr.match(/table\(['"]([^'"]+)['"]\)/);
  if (!matches) {
    throw new Error("Knex 查询必须以 table('tablename') 开头");
  }
  const tableName = matches[1];

  // 提取方法链
  const methodPattern = /\.(\w+)\(['"]?([^'")]+)['"]?\)?/g;
  const methods = [];
  let match;

  // 跳过 table()，处理后面的方法
  const afterTable = knexExpr.substring(knexExpr.indexOf(matches[0]) + matches[0].length);

  while ((match = methodPattern.exec(afterTable)) !== null) {
    methods.push({
      method: match[1],
      args: [match[2]],
    });
  }

  query = db(tableName);
  for (const m of methods) {
    query = query[m.method](...m.args);
  }

  return await query;
}

// 主函数
async function main() {
  const { dbType, sshParams, dbParams, query, isKnexMode, knexQuery } = parseArgs();

  if (!dbType) {
    showHelp();
    process.exit(1);
  }

  // 验证数据库类型
  const validDbTypes = ["mysql", "pg", "sqlite"];
  if (!validDbTypes.includes(dbType)) {
    console.error(`❌ 不支持的数据库类型: ${dbType}`);
    console.error(`支持的类型: ${validDbTypes.join(", ")}`);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🗄️  数据库客户端");
  console.log("=".repeat(60));

  let tunnel = null;
  let db = null;

  try {
    let knexConfig;
    let dbHost, dbPort;

    if (sshParams) {
      // SSH 隧道模式
      if (!dbParams) {
        throw new Error("SSH 模式需要使用 --db 参数指定数据库连接信息");
      }

      dbHost = dbParams.host || "localhost";
      dbPort = parseInt(dbParams.port || (dbType === "pg" ? 5432 : 3306));

      console.log(`\n📡 连接模式: SSH 隧道`);
      console.log(`SSH 服务器: ${sshParams.user}@${sshParams.host}:${sshParams.port || 22}`);
      console.log(`目标数据库: ${dbHost}:${dbPort}`);

      tunnel = await createSSHTunnel(sshParams, dbHost, dbPort);

      knexConfig = buildKnexConfig(dbType, dbParams, tunnel.localPort);
    } else {
      // 直接连接模式
      if (!dbParams) {
        throw new Error("请提供数据库连接参数，格式: key1:value1,key2:value2");
      }

      if (dbType === "sqlite" && !dbParams.file) {
        throw new Error("SQLite 需要指定 file 参数");
      }
      if (dbType !== "sqlite" && !dbParams.database) {
        throw new Error(`${dbType.toUpperCase()} 需要指定 database 参数`);
      }

      console.log(`\n📡 连接模式: 直接连接`);
      console.log(`数据库类型: ${dbType.toUpperCase()}`);

      if (dbType === "sqlite") {
        console.log(`数据库文件: ${dbParams.file}`);
      } else {
        console.log(`连接地址: ${dbParams.host || "localhost"}:${dbParams.port || (dbType === "pg" ? 5432 : 3306)}`);
        console.log(`数据库: ${dbParams.database}`);
        console.log(`用户: ${dbParams.user}`);
      }

      knexConfig = buildKnexConfig(dbType, dbParams);
    }

    // 创建数据库连接
    db = knex(knexConfig);

    // 测试连接
    console.log("\n⏳ 连接数据库...");
    await db.raw("SELECT 1");
    console.log("✓ 数据库连接成功");

    // 执行查询或显示概览
    if (query) {
      let result;
      if (isKnexMode) {
        result = await executeKnex(db, query);
      } else {
        result = await executeSQL(db, query);
      }

      // 处理结果
      let rows = result;
      if (result && typeof result === "object") {
        if (Array.isArray(result)) {
          rows = result;
        } else if (result.rows) {
          rows = result.rows; // PostgreSQL
        } else if (result[0]) {
          rows = result[0]; // MySQL
        }
      }

      console.log(`\n✓ 查询结果: ${Array.isArray(rows) ? rows.length : 1} 条记录\n`);

      if (Array.isArray(rows)) {
        if (rows.length === 0) {
          console.log("  (无结果)");
        } else if (rows.length <= 50) {
          console.table(rows);
        } else {
          console.log(`\n前 20 条:\n`);
          console.table(rows.slice(0, 20));
          console.log(`\n... 还有 ${rows.length - 20} 条记录\n`);
        }
      } else {
        console.log(rows);
      }

    } else if (knexQuery) {
      const result = await executeKnex(db, knexQuery);
      console.log(`\n✓ 查询结果: ${Array.isArray(result) ? result.length : 1} 条记录\n`);

      if (Array.isArray(result)) {
        if (result.length > 0) {
          console.table(result.slice(0, 50));
        } else {
          console.log("  (无结果)");
        }
      } else {
        console.log(result);
      }

    } else {
      // 显示概览
      await showDatabaseOverview(db);
    }

  } catch (err) {
    console.error(`\n❌ 错误: ${err.message}`);
    // 输出详细错误信息用于调试
    if (process.env.DEBUG) {
      console.error("\n详细错误信息:");
      console.error(err.stack || err);
    }
    if (err.message.includes("connect") || err.message.includes("ECONNREFUSED") || err.code === "ECONNREFUSED") {
      console.error("\n💡 提示:");
      console.error("  - 请检查数据库服务器是否运行");
      console.error("  - 请检查主机地址和端口是否正确");
      console.error("  - 请检查网络连接是否正常");
    } else if (err.message.includes("auth") || err.message.includes("access denied")) {
      console.error("\n💡 提示: 用户名或密码错误");
    }
    process.exit(1);
  } finally {
    // 清理资源
    if (db) await db.destroy();
    closeSSHTunnel(tunnel);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ 完成！");
  console.log("=".repeat(60) + "\n");
}

// 运行主程序
main().catch(err => {
  console.error(err);
  process.exit(1);
});
