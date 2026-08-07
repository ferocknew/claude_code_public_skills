// 组件管理命令：list / search / get / delete
// Nexus3 中「组件（component）」= 逻辑单元，所有格式统一：
//   docker  -> name=镜像名,  version=tag
//   npm     -> name=包名,     version=版本,  group=scope(@xxx)
//   pypi    -> name=包名,     version=版本
//   maven2  -> group=groupId, name=artifactId, version=版本
// 删除组件即删除其全部关联资产（assets）。

const SEARCH_BASE = '/service/rest/v1/search';

async function components(parsed, api) {
  const sub = parsed.subcommand || 'list';

  switch (sub) {
    case 'list':
      return await listComponents(parsed, api);
    case 'search':
      return await searchComponents(parsed, api);
    case 'get':
      return await getComponent(parsed, api);
    case 'delete':
    case 'rm':
      return await deleteComponents(parsed, api);
    default:
      throw new Error(`未知 components 子命令：${sub}（支持 list / search / get / delete）`);
  }
}

// 列出仓库组件（continuationToken 分页）
async function listComponents(parsed, api) {
  if (!parsed.repo) throw new Error('缺少 --repo，请指定仓库名');
  const limit = parsed.limit || 50;
  const items = [];
  let token = null;
  let pages = 0;
  do {
    let ep = `/service/rest/v1/components?repository=${encodeURIComponent(parsed.repo)}`;
    if (token) ep += `&continuationToken=${encodeURIComponent(token)}`;
    const data = await api(ep);
    if (data && Array.isArray(data.items)) {
      for (const c of data.items) items.push(toRow(c));
    }
    token = data && data.continuationToken;
    pages++;
  } while (token && items.length < limit && pages < 50);

  return items.slice(0, limit);
}

// 搜索组件（支持 name/version/group 过滤）
async function searchComponents(parsed, api) {
  if (!parsed.repo) throw new Error('缺少 --repo');
  if (!parsed.name && !parsed.group) {
    throw new Error('search 至少需要 --name 或 --group 作为过滤条件');
  }
  const items = await search(parsed, api);
  return items.map(toRow);
}

// 获取单个组件详情（原始 JSON，含 assets 列表）
async function getComponent(parsed, api) {
  if (!parsed.id) throw new Error('缺少 --id');
  return await api(`/service/rest/v1/components/${encodeURIComponent(parsed.id)}`);
}

// 删除组件（核心）
// 通用：--repo + --name [+ --version] [+ --group]，或直接 --id
// 不指定 --version 时可能命中多个版本 → 默认预览，加 --yes 批量删除
async function deleteComponents(parsed, api) {
  // 直接按 id 删除
  if (parsed.id) {
    if (!parsed.yes) {
      return { dryRun: true, count: 1, message: `将删除组件 id=${parsed.id}，加 --yes 真正执行` };
    }
    await api(`/service/rest/v1/components/${encodeURIComponent(parsed.id)}`, { method: 'DELETE' });
    return { deleted: 1, total: 1, failed: [], message: `已删除组件 id=${parsed.id}` };
  }

  if (!parsed.repo || !parsed.name) {
    throw new Error('删除组件需提供 --repo + --name（+ 可选 --version/--group），或直接 --id');
  }

  const items = await search(parsed, api);
  if (items.length === 0) {
    return { deleted: 0, message: '未找到匹配的组件' };
  }

  if (!parsed.yes) {
    return previewDelete(items, parsed.version ? 'version' : 'all-matches');
  }

  return await batchDelete(api, items);
}

// 调用 search API，分页聚合全部命中（含 id/name/version/group/format/repository/assets）
// 导出供 docker.js 复用
async function search(parsed, api) {
  const params = [`repository=${encodeURIComponent(parsed.repo)}`];
  if (parsed.name) params.push(`name=${encodeURIComponent(parsed.name)}`);
  if (parsed.version) params.push(`version=${encodeURIComponent(parsed.version)}`);
  if (parsed.group) params.push(`group=${encodeURIComponent(parsed.group)}`);

  const all = [];
  let token = null;
  let pages = 0;
  do {
    let ep = `${SEARCH_BASE}?${params.join('&')}`;
    if (token) ep += `&continuationToken=${encodeURIComponent(token)}`;
    const data = await api(ep);
    if (data && Array.isArray(data.items)) all.push(...data.items);
    token = data && data.continuationToken;
    pages++;
  } while (token && pages < 20);

  return all;
}

function toRow(c) {
  return {
    _columns: ['format', 'group', 'name', 'version', 'id'],
    format: c.format || '',
    group: c.group || '',
    name: c.name || '',
    version: c.version || '',
    id: c.id || '',
    repository: c.repository || '',
  };
}

function previewDelete(items, scope) {
  return {
    dryRun: true,
    scope,
    count: items.length,
    message: `将删除以下 ${items.length} 个组件（当前为预览，加 --yes 真正执行删除）`,
    components: items.map(c => ({ format: c.format, group: c.group, name: c.name, version: c.version, id: c.id })),
  };
}

async function batchDelete(api, items) {
  let deleted = 0;
  const failed = [];
  for (const it of items) {
    try {
      await api(`/service/rest/v1/components/${encodeURIComponent(it.id)}`, { method: 'DELETE' });
      deleted++;
    } catch (e) {
      failed.push({ id: it.id, name: it.name, version: it.version, error: e.message });
    }
  }
  return { deleted, total: items.length, failed };
}

module.exports = components;
module.exports.search = search;
module.exports.batchDelete = batchDelete;
