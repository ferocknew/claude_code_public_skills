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

// 检查是否存在 node_modules
const hasNodeModules = fs.existsSync(path.join(__dirname, "node_modules"));

// 外部依赖（不打包进 skill.js）
// ripgrep 和 textract 通过 npx 或全局安装使用
const external = [
  "textract",
  "@vscode/ripgrep",
];

// 打包 run.js -> skill.js
try {
  buildSync({
    entryPoints: ["run.js"],
    bundle: true,
    platform: "node",
    outfile: "skill.js",
    external: hasNodeModules ? [] : external,
    minify: false,
    sourcemap: false,
    banner: {
      js: `// 文档搜索工具 v${version}\n`,
    },
    define: {
      '__VERSION': `"${version}"`,
    },
  });
  console.log(`✓ run.js -> skill.js (v${version})`);
} catch (e) {
  console.error("✗ 打包 run.js 失败:", e.message);
  process.exit(1);
}

console.log("\n打包完成！");
console.log(`版本号: v${version}`);
console.log("\n使用方式:");
console.log("  node skill.js <目录路径> <搜索关键词>");
console.log("\n选项:");
console.log("  -s, --case-sensitive  区分大小写");
console.log("  -e, --regex           使用正则表达式");
console.log("  -w, --word            全词匹配");
console.log("  -m, --max-results N   最大结果数量");

// 更新 SKILL.md 中的版本号
updateSkillVersion(version);
