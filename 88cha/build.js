#!/usr/bin/env node

const { buildSync } = require("esbuild");
const fs = require("fs");
const path = require("path");

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

function updateSkillVersion(version) {
  const skillMdPath = path.join(__dirname, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) return;
  let content = fs.readFileSync(skillMdPath, "utf8");
  content = content.replace(/version: [\d.]+/, `version: ${version}`);
  fs.writeFileSync(skillMdPath, content);
}

const version = getTimestamp();

if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  console.error("请先执行 pnpm install 安装依赖");
  process.exit(1);
}

try {
  buildSync({
    entryPoints: ["run.js"],
    bundle: true,
    platform: "node",
    outfile: "skill.js",
    minify: false,
    sourcemap: false,
    banner: {
      js: `// 88查企业搜索工具 v${version}\n`,
    },
    define: {
      '__VERSION': `"${version}"`,
    },
  });
  console.log(`打包完成: v${version}`);
} catch (e) {
  console.error("打包失败:", e.message);
  process.exit(1);
}

updateSkillVersion(version);
