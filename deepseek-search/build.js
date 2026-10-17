#!/usr/bin/env node
/**
 * 打包脚本 - 将 run.js 打包为单个 skill.js
 *
 * 用法: node build.js
 *
 * 打包优先走 esbuild 的 JS API（buildSync）；部分受限沙箱禁止以管道 stdio 启动
 * 子进程（spawn EPERM），此时自动回退到直接执行 esbuild 二进制并使用继承 stdio，
 * 产物与 buildSync 完全一致。
 */

const { buildSync } = require("esbuild");
const { spawnSync } = require("child_process");
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

/** 定位 esbuild 二进制（回退路径用） */
function resolveEsbuildBin() {
  const platform = `${process.platform}-${process.arch}`;
  const binName = process.platform === "win32" ? "esbuild.exe" : path.join("bin", "esbuild");

  // 常规形态：node_modules/@esbuild/<platform>/esbuild[.exe]
  const direct = path.join(__dirname, "node_modules", "@esbuild", platform, binName);
  if (fs.existsSync(direct)) return direct;

  // pnpm 的 isolated linker 下，平台包可能只存在于 .pnpm 虚拟 store 中
  // （postinstall 被跳过或失败时不会创建顶层链接）
  const pnpmDir = path.join(__dirname, "node_modules", ".pnpm");
  if (fs.existsSync(pnpmDir)) {
    const prefix = `@esbuild+${platform}@`;
    for (const entry of fs.readdirSync(pnpmDir)) {
      if (!entry.startsWith(prefix)) continue;
      const candidate = path.join(pnpmDir, entry, "node_modules", "@esbuild", platform, binName);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/** 回退方案：直接执行 esbuild 二进制（继承 stdio，不触发管道限制） */
function buildWithCli(version) {
  const bin = resolveEsbuildBin();
  if (!bin) return false;
  const args = [
    "run.js",
    "--bundle",
    "--platform=node",
    "--target=node18",
    "--outfile=skill.js",
    `--banner:js=${BANNER}`,
    `--define:__VERSION="${version}"`,
    "--log-level=warning",
  ];
  const r = spawnSync(bin, args, { cwd: __dirname, stdio: "inherit" });
  return r.status === 0 && fs.existsSync(path.join(__dirname, "skill.js"));
}

const version = getTimestamp();
const BANNER = `// DeepSeek 网页搜索与抓取工具 v${version} - 无需安装依赖`;

console.log(`开始打包 deepseek-search v${version}...\n`);

let built = false;
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
      js: `${BANNER}\n`,
    },
    define: {
      __VERSION: `"${version}"`,
    },
  });
  built = true;
} catch (e) {
  console.log(`⚠ esbuild JS API 打包失败（${e.message}），回退到 esbuild 二进制...`);
  built = buildWithCli(version);
  if (!built) {
    console.error("✗ 打包失败:", e.message);
    process.exit(1);
  }
}

console.log(`✓ run.js -> skill.js (v${version})`);

updateSkillVersion(version);

console.log("\n打包完成！");
console.log(`\n使用方式:\n  node skill.js <command> [args] [options]\n`);
