// 资产管理命令：list / delete
// 资产（asset）= 物理文件单元；组件由若干资产组成。
// GET    /service/rest/v1/assets?repository=<repo>  —— 分页列出
// DELETE /service/rest/v1/assets/{id}                —— 删除单个资产

async function assets(parsed, api) {
  const sub = parsed.subcommand || 'list';

  switch (sub) {
    case 'list':
      return await listAssets(parsed, api);
    case 'delete':
    case 'rm':
      return await deleteAsset(parsed, api);
    default:
      throw new Error(`未知 assets 子命令：${sub}（支持 list / delete）`);
  }
}

async function listAssets(parsed, api) {
  if (!parsed.repo) throw new Error('缺少 --repo');
  const limit = parsed.limit || 50;
  const items = [];
  let token = null;
  let pages = 0;
  do {
    let ep = `/service/rest/v1/assets?repository=${encodeURIComponent(parsed.repo)}`;
    if (token) ep += `&continuationToken=${encodeURIComponent(token)}`;
    const data = await api(ep);
    if (data && Array.isArray(data.items)) {
      for (const a of data.items) items.push(toRow(a));
    }
    token = data && data.continuationToken;
    pages++;
  } while (token && items.length < limit && pages < 50);

  return items.slice(0, limit);
}

async function deleteAsset(parsed, api) {
  if (!parsed.id) throw new Error('缺少 --id');
  if (!parsed.yes) {
    return { dryRun: true, message: `将删除资产 id=${parsed.id}，加 --yes 真正执行` };
  }
  await api(`/service/rest/v1/assets/${encodeURIComponent(parsed.id)}`, { method: 'DELETE' });
  return { deleted: 1, message: `已删除资产 id=${parsed.id}` };
}

function toRow(a) {
  return {
    _columns: ['format', 'path', 'id'],
    format: a.format || '',
    path: a.path || '',
    id: a.id || '',
    downloadUrl: a.downloadUrl || '',
    repository: a.repository || '',
  };
}

module.exports = assets;
