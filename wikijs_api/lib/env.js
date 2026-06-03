/**
 * 环境配置模块
 * 负责加载 .env 文件和解析 URL/Token 参数
 */

const fs = require("fs");
const path = require("path");

/**
 * 加载 .env 文件，仅在环境变量不存在时设置（不覆盖已有值）
 * @param {string} envPath - .env 文件路径
 */
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  });
}

// 定位 .env 文件
// - 打包后 skill.js: __dirname 就是 skill 根目录，直接 .env
// - 源码 run.js: __dirname 是 lib/，需要 ../.env
const envPath = fs.existsSync(path.join(__dirname, ".env"))
  ? path.join(__dirname, ".env")
  : path.join(__dirname, "..", ".env");
loadEnvFile(envPath);

/**
 * 解析命令行参数中的 URL/Token，返回剥离后的参数
 *
 * @param {string[]} positional - 解析后的位置参数
 * @returns {{ url: string, token: string, args: string[] }}
 */
function resolve(positional) {
  let url = process.env.WIKI_URL || "";
  let token = process.env.WIKI_TOKEN || "";
  const args = [...positional];

  // 启发式检测：命令行中的 URL 和 Token
  if (args.length > 0 && /^https?:\/\//i.test(args[0])) {
    url = args.shift();
  }
  if (args.length > 0 && /^eyJ[A-Za-z0-9_-]/.test(args[0])) {
    token = args.shift();
  }

  return { url, token, args };
}

module.exports = { resolve };
