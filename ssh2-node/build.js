#!/usr/bin/env node
/**
 * 打包脚本 - 将依赖打包进单个文件，产出零依赖的 skill.js
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

// 更新 SKILL.md 中的版本号
function updateSkillVersion(version) {
  const skillMdPath = path.join(__dirname, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    console.log("⚠ SKILL.md 不存在，跳过版本号更新");
    return;
  }

  let content = fs.readFileSync(skillMdPath, "utf8");
  const versionLine = `version: ${version}`;

  if (/^version: .*$/m.test(content)) {
    content = content.replace(/^version: .*$/m, versionLine);
  } else if (/^skill_version: .*$/m.test(content)) {
    content = content.replace(/^skill_version: .*$/m, versionLine);
  } else {
    content = content.replace(/^(---\nname: .*\n)/m, `$1${versionLine}\n`);
  }

  fs.writeFileSync(skillMdPath, content);
  console.log(`✓ SKILL.md 版本号已更新: ${version}`);
}

const version = getTimestamp();

console.log("开始打包...\n");

if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  console.error("错误: 请先执行 pnpm install 安装依赖");
  process.exit(1);
}

/**
 * ssh2 内部含原生加速模块，必须外部化，否则 esbuild 报
 * "No loader is configured for .node files"。
 *
 * 外部化后运行时 require 失败是预期行为：ssh2 会回退到纯 JS 实现，
 * 功能完全不受影响（已实测验证）。
 */
const external = [
  // 可选原生依赖：用于生成最优 cipher 列表，缺失时自动降级
  "cpu-features",
  // ssh2 自带原生加密模块的不同安装路径
  "./crypto/build/Release/sshcrypto.node",
  "./build/Release/sshcrypto.node",
  // 全路径兜底（不同解析上下文下可能带上相对前缀）
  "../crypto/build/Release/sshcrypto.node",
  "../../crypto/build/Release/sshcrypto.node",
];

try {
  buildSync({
    entryPoints: ["run.js"],
    bundle: true,
    platform: "node",
    target: "node18",
    outfile: "skill.js",
    external,
    minify: false,
    sourcemap: false,
    banner: {
      js: `// SSH 客户端工具 v${version} - 包含所有依赖，无需安装\n// 基于 ssh2，支持 exec / shell / sftp / tunnel / keygen\n`,
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
console.log(`版本号: ${version}`);
console.log("\n使用方式:");
console.log("  node skill.js exec \"uname -a\" --ssh host:1.2.3.4,user:root,password:xxx");
console.log("  node skill.js sftp put ./dist /var/www --ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519");
console.log("  node skill.js tunnel --local 13306 --remote-host 10.0.0.5 --remote-port 3306 --ssh host:1.2.3.4,user:root,password:xxx");
