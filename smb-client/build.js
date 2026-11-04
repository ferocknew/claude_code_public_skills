#!/usr/bin/env node
/**
 * 打包脚本 - 将 src/index.js + @marsaud/smb2 打包为单个 skill.js
 *
 * 用法: node build.js
 */

const { buildSync } = require("esbuild");
const fs = require("fs");
const path = require("path");

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

function updateSkillVersion(version) {
  const skillMdPath = path.join(__dirname, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    console.log("⚠ SKILL.md 不存在，跳过版本号更新");
    return;
  }
  let content = fs.readFileSync(skillMdPath, "utf8");
  if (/^skill_version:.*$/m.test(content)) {
    content = content.replace(/^skill_version:.*$/m, `skill_version: ${version}`);
  } else {
    content = content.replace(/^---\n/, `---\nskill_version: ${version}\n`);
  }
  fs.writeFileSync(skillMdPath, content);
  console.log(`✓ SKILL.md skill_version 已更新: ${version}`);
}

/**
 * esbuild 0.28+ 会将动态 require 编译为 __glob 辅助函数，
 * 而 @marsaud/smb2 使用 require('../messages/' + messageName) 不带 .js 后缀，
 * 这里为 map 查找补上扩展名回退，确保运行时能精准命中被打包的模块。
 */
function patchGlobExtension(outfile) {
  let code = fs.readFileSync(outfile, "utf8");
  const needle = "var fn = map[path2];";
  const replacement = 'var fn = map[path2] || map[path2 + ".js"];';

  if (code.includes(needle)) {
    code = code.replace(needle, replacement);
    fs.writeFileSync(outfile, code);
    console.log("✓ 已注入 __glob 扩展名兼容补丁（@marsaud/smb2 动态 require）");
  } else if (code.includes(replacement)) {
    console.log("✓ __glob 扩展名兼容补丁已存在");
  } else {
    console.log("⚠ 未找到 __glob 原始模式，跳过补丁（请检查 esbuild 版本）");
  }
}

const version = getTimestamp();
const outfile = path.join(__dirname, "skill.js");

console.log(`开始打包 smb-client v${version}...\n`);

try {
  buildSync({
    entryPoints: [path.join(__dirname, "src/index.js")],
    bundle: true,
    platform: "node",
    target: "node18",
    outfile,
    minify: false,
    sourcemap: false,
    banner: {
      js: `// SMB / CIFS 客户端工具 v${version} - 无需安装依赖\n`,
    },
    define: {
      __VERSION: JSON.stringify(version),
    },
  });
  console.log(`✓ src/index.js -> skill.js (v${version})`);
} catch (e) {
  console.error("✗ 打包失败:", e.message);
  process.exit(1);
}

patchGlobExtension(outfile);
updateSkillVersion(version);

console.log("\n打包完成！");
console.log(`\n使用方式:\n  node skill.js <command> [args] [options]\n`);
