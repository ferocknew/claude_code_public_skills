#!/usr/bin/env node
/**
 * 打包脚本 - 将依赖打包进单个文件
 *
 * 用法: node build.js
 */

const { buildSync } = require("esbuild");
const fs = require("fs");
const path = require("path");

// 生成时间戳版本号 YYMMDD.HHmmSS
function getTimestamp() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yy}${MM}${DD}.${HH}${mm}${ss}`;
}

// 更新 SKILL.md 中的版本号
function updateSkillVersion(version) {
  const skillMdPath = path.join(__dirname, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    console.log("⚠ SKILL.md 不存在，跳过版本号更新");
    return;
  }

  let content = fs.readFileSync(skillMdPath, "utf8");
  const versionLine = `version: ${version}`;

  // 更新 version 字段为时间戳格式
  if (content.includes("version:")) {
    content = content.replace(/version: [\d.]+/, versionLine);
  }

  fs.writeFileSync(skillMdPath, content);
  console.log(`✓ SKILL.md 版本号已更新: ${version}`);
}

const version = getTimestamp();

console.log("开始打包...\n");

// 确保依赖已安装
if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  console.error("错误: 请先执行 pnpm install 安装依赖");
  process.exit(1);
}

// React Native 相关包（仅在 RN 环境使用，Node.js 不需要）
const external = [
  "react-native",
  "react-native-fs",
  "react-native-fetch-blob",
];

// 原生模块需要外部化（运行时需要系统安装）
const nativeModules = [
  "better-sqlite3",
  "ssh2",
  // Knex 可选驱动（我们只需要 mysql2, pg, better-sqlite3）
  "mysql",
  "sqlite3",
  "tedious",
  "oracledb",
  "pg-query-stream",
];

// 打包 run.js -> skill.js
try {
  buildSync({
    entryPoints: ["run.js"],
    bundle: true,
    platform: "node",
    outfile: "skill.js",
    external: [...external, ...nativeModules],
    minify: false,
    sourcemap: false,
    banner: {
      js: `// 数据库客户端 v${version} - 包含所有依赖，无需安装\n// 注意: SQLite 需要 better-sqlite3，SSH 隧道需要 ssh2\n`,
    },
    define: {
      '__VERSION': `"${version}"`,
    },
  });
  console.log(`✓ run.js -> skill.js (v${version})`);
} catch (e) {
  console.error("✗ 打包 run.js 失败:", e.message);
}

console.log("\n打包完成！");
console.log(`版本号: v${version}`);
console.log("\n使用方式:");
console.log("  node skill.js <数据库类型> <连接参数> [查询]");
console.log("\n示例:");
console.log("  node skill.js mysql host:localhost,port:3306,user:root,password:123,database:testdb");
console.log("  node skill.js pg host:localhost,port:5432,user:postgres,password:123,database:testdb");
console.log("  node skill.js sqlite file:/path/to/database.db");
console.log("\nSSH 隧道:");
console.log("  node skill.js mysql --ssh host:server.com,user:ubuntu,port:22 --db host:localhost,port:3306,user:root,password:123,database:testdb");

// 更新 SKILL.md 中的版本号
updateSkillVersion(version);
