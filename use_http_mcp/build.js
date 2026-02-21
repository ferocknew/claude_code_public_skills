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
  const versionLine = `skill_version: ${version}`;

  // 检查是否已有 skill_version
  if (content.includes("skill_version:")) {
    content = content.replace(/skill_version: [\d.]+/, versionLine);
  } else {
    // 在 version 字段后添加 skill_version
    content = content.replace(
      /version: [\d.]+\n/,
      `version: 1.0.0\nskill_version: ${version}\n`
    );
  }

  fs.writeFileSync(skillMdPath, content);
  console.log(`✓ SKILL.md 版本号已更新: ${version}`);
}

const version = getTimestamp();

console.log("开始打包...\n");

// React Native 相关包（仅在 RN 环境使用，Node.js 不需要）
const external = [
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
      js: `// HTTP MCP 工具 v${version} - 基于 Node.js 原生 fetch API\n`,
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
console.log("  node skill.js <method> <url> [options]");

// 更新 SKILL.md 中的版本号
updateSkillVersion(version);
