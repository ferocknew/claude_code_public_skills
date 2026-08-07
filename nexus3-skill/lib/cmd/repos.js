// 仓库管理命令
// GET /service/rest/v1/repositories —— 列出所有仓库（name/format/type/url）

async function repos(parsed, api) {
  const sub = parsed.subcommand || 'list';

  switch (sub) {
    case 'list':
      return await listRepos(parsed, api);
    default:
      throw new Error(`未知 repos 子命令：${sub}（当前支持 list）`);
  }
}

async function listRepos(parsed, api) {
  let list = await api('/service/rest/v1/repositories');
  if (!Array.isArray(list)) return [];

  // 支持按 format 过滤：--format docker
  if (parsed.format) {
    list = list.filter(r => (r.format || '').toLowerCase() === parsed.format.toLowerCase());
  }

  return list.map(r => ({
    _columns: ['name', 'format', 'type', 'url'],
    name: r.name || '',
    format: r.format || '',
    type: r.type || '',
    url: r.url || '',
  }));
}

module.exports = repos;
