/**
 * 环境配置模块
 * 负责加载 .env 文件和解析 URL/Token 参数
 *
 * 思源笔记:
 * - 默认地址: http://127.0.0.1:6806
 * - 认证: Authorization: Token xxx
 * - Token 在 设置 > 关于 中查看
 */

const fs = require("fs");
const path = require("path");

/**
 * 加载 .env 文件，覆盖已有环境变量
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
  let url = process.env.SIYUAN_URL || "";
  let token = process.env.SIYUAN_API_TOKEN || process.env.SIYUAN_TOKEN || "";
  const args = [...positional];

  // 启发式检测：命令行中的 URL 和 Token
  // URL: http:// 或 https:// 开头
  if (args.length > 0 && /^https?:\/\//i.test(args[0])) {
    url = args.shift();
  }

  // Token: 思源笔记 Token 通常是较长的字母数字字符串
  // 避免误识别短命令参数，要求长度 >= 10 且不含空格
  if (args.length > 0 && /^[A-Za-z0-9]{10,}$/.test(args[0])) {
    token = args.shift();
  }

  return { url, token, args };
}

module.exports = { resolve };
