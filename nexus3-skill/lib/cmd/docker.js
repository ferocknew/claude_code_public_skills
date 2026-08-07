// Docker 镜像删除便捷命令：rm / tags
// Nexus3 中 docker 镜像的每个 image:tag 是一个独立 component（format=docker）：
//   name=镜像名, version=tag
// 删除特定 tag = 定位 component 后 DELETE（与 npm/pypi/maven 同机制）。

const componentsApi = require('./components');

async function docker(parsed, api) {
  const sub = parsed.subcommand;

  switch (sub) {
    case 'rm':
    case 'rmi':
    case 'delete':
      return await removeTag(parsed, api);
    case 'tags':
    case 'list':
      return await listTags(parsed, api);
    default:
      throw new Error(`未知 docker 子命令：${sub}（支持 rm / tags）`);
  }
}

// 删除 docker 镜像的指定 tag（支持多 tag 逗号分隔、或 --all-tags 全删）
async function removeTag(parsed, api) {
  const repo = parsed.repo;
  const image = parsed.image || parsed.name;
  if (!repo || !image) {
    throw new Error('docker rm 需要 --repo + --image（或 --name 指定镜像名）');
  }

  // 删除该镜像的全部 tag
  if (parsed.allTags) {
    const items = await componentsApi.search({ repo, name: image }, api);
    if (items.length === 0) {
      return { deleted: 0, message: `镜像 ${image} 无任何 tag` };
    }
    const result = await doDelete(parsed, api, items, `镜像 ${image} 的全部 ${items.length} 个 tag`);
    return result;
  }

  // 指定 tag（逗号分隔可删多个）
  const tag = parsed.tag || parsed.version;
  if (!tag) {
    throw new Error('docker rm 需要 --tag 指定 tag（或 --all-tags 删除全部 tag）');
  }
  const tags = String(tag)
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const found = [];
  const missing = [];
  for (const t of tags) {
    const items = await componentsApi.search({ repo, name: image, version: t }, api);
    if (items.length > 0) found.push(...items);
    else missing.push(t);
  }

  if (found.length === 0) {
    return { deleted: 0, missing, message: `未找到镜像 ${image} 的 tag: ${tags.join(', ')}` };
  }

  const result = await doDelete(parsed, api, found, `镜像 ${image} 的 tag ${tags.join(', ')}`);
  if (missing.length) result.missing = missing;
  return result;
}

// 列出某镜像的所有 tag
async function listTags(parsed, api) {
  const repo = parsed.repo;
  const image = parsed.image || parsed.name;
  if (!repo || !image) {
    throw new Error('docker tags 需要 --repo + --image（或 --name）');
  }
  const items = await componentsApi.search({ repo, name: image }, api);
  return items.map(c => ({
    _columns: ['name', 'tag', 'id'],
    name: c.name || '',
    tag: c.version || '',
    id: c.id || '',
  }));
}

async function doDelete(parsed, api, items, desc) {
  if (!parsed.yes) {
    return {
      dryRun: true,
      description: desc,
      count: items.length,
      message: `将删除 ${desc}（共 ${items.length} 个组件），加 --yes 真正执行`,
      components: items.map(c => ({ name: c.name, tag: c.version, id: c.id })),
    };
  }
  const result = await componentsApi.batchDelete(api, items);
  result.description = desc;
  return result;
}

module.exports = docker;
