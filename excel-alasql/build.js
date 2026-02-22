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

// 打包 run.js -> skill.js
try {
  buildSync({
    entryPoints: ["run.js"],
    bundle: true,
    platform: "node",
    outfile: "skill.js",
    external,
    minify: false,
    sourcemap: false,
    banner: {
      js: `// Excel 工具 v${version} - 包含所有依赖，无需安装\n`,
    },
    define: {
      '__VERSION': `"${version}"`,
    },
  });
  console.log(`✓ run.js -> skill.js (v${version})`);
} catch (e) {
  console.error("✗ 打包 run.js 失败:", e.message);
}

// 打包 quick-analyze.js -> skill-analyze.js
try {
  buildSync({
    entryPoints: ["quick-analyze.js"],
    bundle: true,
    platform: "node",
    outfile: "skill-analyze.js",
    external,
    minify: false,
    sourcemap: false,
    banner: {
      js: `// Excel 快速分析工具 v${version} - 包含所有依赖，无需安装\n`,
    },
    define: {
      '__VERSION': `"${version}"`,
    },
  });
  console.log(`✓ quick-analyze.js -> skill-analyze.js (v${version})`);
} catch (e) {
  console.error("✗ 打包 quick-analyze.js 失败:", e.message);
}

console.log("\n打包完成！");
console.log(`版本号: v${version}`);
console.log("\n使用方式:");
console.log("  node skill.js <文件路径>");
console.log("  node skill-analyze.js <文件路径>");

// 更新 SKILL.md 中的版本号
updateSkillVersion(version);
