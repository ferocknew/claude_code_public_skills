/**
 * 环境配置模块
 * 负责加载 .env 文件和解析 URL/Token 参数
 */

const fs = require("fs");
const path = require("path");

/**
 * 加载 .env 文件（不覆盖已有的环境变量）
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
    process.env[key] = val;
  });
}

/**
 * 解析命令行参数中的 URL/Token，返回剥离后的参数
 *
 * 优先级：
 *   1. 同目录 .env 文件（启动时自动加载）
 *   2. 命令行参数中的 URL（http 开头）/ Token（eyJ 开头）
 *   3. 已有的环境变量（最高优先级，不被覆盖）
 *
 * @param {string[]} positional - 解析后的位置参数
 * @returns {{ url: string, token: string, args: string[] }}
 */
function resolve(positional) {
  // 加载 skill.js 同目录下的 .env（打包后 __dirname 即为 skill.js 所在目录）
  loadEnvFile(path.join(__dirname, ".env"));

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
