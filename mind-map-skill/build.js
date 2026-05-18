#!/usr/bin/env node
/**
 * 打包脚本 - 将 run.js + lib/* 打包为单个 skill.js
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
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yy}${MM}${DD}.${HH}${mm}${ss}`;
}

// 更新 SKILL.md 中的 skill_version
function updateSkillVersion(version) {
  const skillMdPath = path.join(__dirname, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    console.log("⚠ SKILL.md 不存在，跳过版本号更新");
    return;
  }

  let content = fs.readFileSync(skillMdPath, "utf8");
  content = content.replace(/skill_version: .*/, `skill_version: ${version}`);
  fs.writeFileSync(skillMdPath, content);
  console.log(`✓ SKILL.md skill_version 已更新: ${version}`);
}

const version = getTimestamp();

console.log(`开始打包 mind-map-skill v${version}...\n`);

try {
  buildSync({
    entryPoints: ["run.js"],
    bundle: true,
    platform: "node",
    target: "node18",
    outfile: "skill.js",
    minify: false,
    sourcemap: false,
    banner: {
      js: `// 思维导图远程控制工具 v${version} - 无需安装依赖\n`,
    },
    define: {
      __VERSION: `"${version}"`,
    },
  });
  console.log(`✓ run.js -> skill.js (v${version})`);
} catch (e) {
  console.error("✗ 打包失败:", e.message);
  process.exit(1);
}

updateSkillVersion(version);

console.log("\n打包完成！");
console.log(`\n使用方式:\n  node skill.js <command> [args] [options]\n`);
