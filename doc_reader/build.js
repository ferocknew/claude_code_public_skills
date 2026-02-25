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

console.log(`🔨 构建 skill.js (版本: ${version})...\n`);

// 检查入口文件是否存在
const entryPoint = path.join(__dirname, "run.js");
if (!fs.existsSync(entryPoint)) {
  console.error("❌ 错误: run.js 不存在");
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
    minify: false, // 保持可读性
    banner: {
      js: `// DOCX Reader Skill v${version}
// Built: ${now.toISOString()}
const __VERSION = "${version}";`,
    },
    footer: {
      js: "// End of bundled skill",
    },
  })
  .then(() => {
    console.log("✅ skill.js 构建成功!");
    console.log("\n📦 文件信息:");

    // 显示文件大小
    const stats = fs.statSync(path.join(__dirname, "skill.js"));
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   skill.js: ${sizeKB} KB`);
    console.log(`   版本: ${version}`);

    // 更新 SKILL.md 中的版本号
    const skillMdPath = path.join(__dirname, "SKILL.md");
    if (fs.existsSync(skillMdPath)) {
      let content = fs.readFileSync(skillMdPath, "utf8");
      content = content.replace(/version:\s*[\d.]+/, `version: ${version}`);
      fs.writeFileSync(skillMdPath, content);
      console.log("   已更新 SKILL.md 版本号");
    }

    console.log("\n🚀 使用方法:");
    console.log("   node skill.js <docx文件路径>");
    console.log("   node skill.js <docx文件路径> --raw");
    console.log("   node skill.js <docx文件路径> --html");
  })
  .catch((err) => {
    console.error("❌ 构建失败:", err.message);
    process.exit(1);
  });
