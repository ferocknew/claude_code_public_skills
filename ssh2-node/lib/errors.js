/**
 * 错误处理
 *
 * 统一以 JSON 输出到 stderr，便于 LLM 解析。
 */

/**
 * 输出错误并退出
 * @param {Error|string} error - 错误对象或消息
 * @param {string} context - 错误上下文
 * @param {number} code - 退出码
 */
function handleError(error, context = "", code = 1) {
  const message = error instanceof Error ? error.message : String(error);
  const payload = { error: context || "操作失败", message };

  // 针对常见 SSH 错误给出可执行提示
  const hint = buildHint(message);
  if (hint) payload.hint = hint;

  console.error(JSON.stringify(payload));
  process.exit(code);
}

/**
 * 根据错误消息生成排查提示
 * @param {string} message
 * @returns {string|null}
 */
function buildHint(message) {
  if (/All configured authentication methods failed/i.test(message)) {
    return "认证失败：确认用户名/密码正确；使用加密私钥时需同时提供 passphrase；服务器若只允许 keyboard-interactive，请加 --try-keyboard-interactive";
  }
  if (/Cannot parse privateKey/i.test(message) || /bad private key/i.test(message)) {
    return "私钥解析失败：确认私钥格式为 OpenSSH/PEM，且未被加密或已提供正确 passphrase";
  }
  if (/ECONNREFUSED/i.test(message)) {
    return "连接被拒绝：确认目标主机 SSH 服务已启动，端口是否正确（默认 22）";
  }
  if (/ETIMEDOUT|Timed out while waiting/i.test(message)) {
    return "连接超时：确认网络可达、防火墙放行；可加大 --timeout（毫秒）";
  }
  if (/ENOTFOUND|getaddrinfo/i.test(message)) {
    return "主机名无法解析：确认 --host 拼写正确，或 DNS/网络可用";
  }
  if (/ENOENT/i.test(message)) {
    return "本地文件不存在：确认路径拼写正确";
  }
  if (/No such file/i.test(message)) {
    return "远程路径不存在：先用 ls 子命令确认远程目录结构";
  }
  if (/Permission denied/i.test(message)) {
    return "权限不足：确认目标路径对当前用户可读写";
  }
  return null;
}

module.exports = { handleError, buildHint };
