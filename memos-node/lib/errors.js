/**
 * 错误处理
 *
 * 统一以 JSON 输出到 stderr，便于 LLM 解析。
 * hint 是按 HTTP 状态码/消息生成的排查线索，不要随意删除。
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

  if (error && error.status) payload.status = error.status;
  if (error && error.grpcCode !== undefined && error.grpcCode !== null) {
    payload.grpcCode = error.grpcCode;
  }

  const hint = buildHint(error, message);
  if (hint) payload.hint = hint;

  console.error(JSON.stringify(payload));
  process.exit(code);
}

/**
 * 根据状态码与错误消息生成排查提示
 * @param {Error} error
 * @param {string} message
 * @returns {string|null}
 */
function buildHint(error, message) {
  const status = error && error.status;

  if (status === 401) {
    return "未认证：检查 MEMOS_TOKEN 是否为有效的个人访问令牌（在 Memos 网页端「设置 → 访问令牌」创建），且未过期";
  }
  if (status === 403) {
    return "权限不足：该操作只能由 memo 作者执行；请确认 token 对应的账号与 memo 的 creator 一致";
  }
  if (status === 404) {
    return "资源不存在：确认 memo uid 正确（可用 `memo list` 查看），或该 memo 已被删除/不属于当前账号";
  }
  if (status === 400 && /filter/i.test(message)) {
    return "过滤表达式非法：字段名须为 content / creator / created_ts / updated_ts / pinned / visibility / tags / has_link 等；时间过滤写成 created_ts > now - duration(\"168h\")";
  }
  if (status === 400) {
    return "请求参数非法：检查 visibility（PRIVATE|PROTECTED|PUBLIC）、updateMask 字段名、state（NORMAL|ARCHIVED）拼写";
  }
  if (status === 501) {
    return "该接口在当前 Memos 版本未实现：老版本可能缺少此功能，请确认实例版本（instance profile 可查）";
  }
  if (/ECONNREFUSED/i.test(message)) {
    return "连接被拒绝：确认 MEMOS_URL 地址与端口正确，且 Memos 服务已启动";
  }
  if (/ENOTFOUND|getaddrinfo/i.test(message)) {
    return "域名无法解析：确认 MEMOS_URL 拼写正确，或网络/DNS 可用";
  }
  if (/certificate|self-signed|self signed/i.test(message)) {
    return "证书校验失败：自签名证书可加 --insecure（或设 MEMOS_INSECURE=true）跳过校验，仅建议内网使用";
  }
  if (/请求超时/.test(message)) {
    return "请求超时：可加大 --timeout（毫秒），或检查网络与代理";
  }
  return null;
}

module.exports = { handleError, buildHint };
