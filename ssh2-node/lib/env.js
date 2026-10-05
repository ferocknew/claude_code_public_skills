/**
 * 配置解析
 *
 * SSH 连接参数统一由 --ssh 选项提供，格式为逗号分隔的 key:value。
 * 例: --ssh host:example.com,user:root,port:22,password:secret
 *
 * 也支持从环境变量读取默认值（SSH_HOST / SSH_USER / SSH_PORT / SSH_PASSWORD / SSH_KEY / SSH_PASSPHRASE）。
 */

/**
 * 解析逗号分隔的 key:value 参数串
 * @param {string} str
 * @returns {Object}
 */
function parseKv(str) {
  const out = {};
  if (!str) return out;

  // 用逗号切分，但 value 里可能含逗号（如 password），此处按首个冒号切 key
  str.split(",").forEach((pair) => {
    const idx = pair.indexOf(":");
    if (idx <= 0) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1);
    if (key) out[key] = value;
  });
  return out;
}

/**
 * 从命令行选项和环境变量构建 SSH 连接配置
 * @param {Object} options - parseArgs 产出的 options
 * @returns {Object} ssh2 connect 配置对象
 */
function resolveSshConfig(options) {
  const fromArg = parseKv(options.ssh);

  const host = fromArg.host || process.env.SSH_HOST;
  const username = fromArg.user || fromArg.username || process.env.SSH_USER || process.env.SSH_USERNAME;
  const port = parseInt(fromArg.port || process.env.SSH_PORT || "22", 10);
  const password = fromArg.password || process.env.SSH_PASSWORD;
  const privateKeyPath = fromArg.privatekey || fromArg.key || process.env.SSH_KEY;
  const passphrase = fromArg.passphrase || process.env.SSH_PASSPHRASE;

  const config = {
    host,
    port,
    username,
    readyTimeout: parseInt(fromArg.timeout || process.env.SSH_TIMEOUT || "20000", 10),
  };

  if (password) config.password = password;
  if (privateKeyPath) config._privateKeyPath = privateKeyPath;
  if (passphrase) config.passphrase = passphrase;

  // 允许显式开启 keyboard-interactive（部分服务器必需）
  if (fromArg.trykeyboardinteractive || options.trykeyboardinteractive) {
    config.tryKeyboard = true;
  }

  return config;
}

/**
 * 校验配置完整性
 * @param {Object} config
 * @returns {string|null} 错误消息，null 表示通过
 */
function validateSshConfig(config) {
  if (!config.host) return "缺少 SSH 主机地址，请提供 --ssh host:<地址>";
  if (!config.username) return "缺少 SSH 用户名，请提供 --ssh user:<用户>";
  if (!config.password && !config._privateKeyPath) {
    return "缺少认证信息，请提供 --ssh password:<密码> 或 --ssh key:<私钥路径>";
  }
  return null;
}

module.exports = { parseKv, resolveSshConfig, validateSshConfig };
