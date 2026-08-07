// 系统状态命令
// GET /service/rest/v1/status        —— 服务器基本信息（无需认证）
// GET /service/rest/v1/status/check  —— 健康检查（返回检查项数组）

async function status(parsed, api) {
  const sub = parsed.subcommand || 'info';

  switch (sub) {
    case 'info':
      return await api('/service/rest/v1/status');
    case 'check':
      return await api('/service/rest/v1/status/check');
    default:
      throw new Error(`未知 status 子命令：${sub}（支持 info / check）`);
  }
}

module.exports = status;
