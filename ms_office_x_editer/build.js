#!/usr/bin/env node
/**
 * 构建脚本 - 使用 esbuild 打包 skill.js
 *
 * 将 run.js 打包为独立的 skill.js，包含所有依赖
 */

const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

// 生成版本号：YYMMDD.HHmmSS
const now = new Date();
const version = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

console.log(`构建 docx_editer skill.js (版本: ${version})...\n`);

// 检查入口文件
const entryPoint = path.join(__dirname, "run.js");
if (!fs.existsSync(entryPoint)) {
  console.error("错误: run.js 不存在");
  process.exit(1);
}

// 检查依赖
if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  console.error("错误: 请先执行 pnpm install 安装依赖");
  process.exit(1);
}

// 使用 esbuild 打包
esbuild
  .build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: "skill.js",
    platform: "node",
    target: "node18",
    external: [
      "react-native",
      "react-native-fs",
      "react-native-fetch-blob",
    ],
    minify: false,
    sourcemap: false,
    banner: {
      js: `// DOCX Editor Skill v${version}\n`,
    },
    define: {
      __VERSION: `"${version}"`,
    },
  })
  .then(() => {
    console.log(`✓ run.js -> skill.js (v${version})`);

    const stats = fs.statSync(path.join(__dirname, "skill.js"));
    console.log(`  文件大小: ${(stats.size / 1024).toFixed(1)} KB`);

    // 更新 SKILL.md 中的版本号
    const skillMdPath = path.join(__dirname, "SKILL.md");
    if (fs.existsSync(skillMdPath)) {
      let content = fs.readFileSync(skillMdPath, "utf8");
      if (content.includes("version:")) {
        content = content.replace(/version:\s*[\d.]+/, `version: ${version}`);
      }
      if (content.includes("skill_version:")) {
        content = content.replace(/skill_version:\s*[\d.]+/, `skill_version: ${version}`);
      }
      fs.writeFileSync(skillMdPath, content);
      console.log("✓ SKILL.md 版本号已更新");
    }

    console.log("\n打包完成！");
    console.log("\n使用方式:");
    console.log("  node skill.js <file> info");
    console.log("  node skill.js <file> text-read");
    console.log("  node skill.js <file> text-find \"关键词\"");
    console.log("  node skill.js <file> text-replace '{\"find\":\"old\",\"replace\":\"new\"}'");
  })
  .catch((err) => {
    console.error("打包失败:", err.message);
    process.exit(1);
  });
