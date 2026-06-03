// Packages commands

async function packages(parsed, api) {
  const sub = parsed.subcommand || 'list';

  switch (sub) {
    case 'list':
      return await listPackages(parsed, api);
    default:
      throw new Error(`Unknown packages subcommand: ${sub}`);
  }
}

async function listPackages(parsed, api) {
  const type = parsed.type || '';
  const limit = parsed.limit || 50;

  // If owner specified, query single owner
  if (parsed.owner) {
    return await getPackagesForOwner(api, parsed.owner, type, limit);
  }

  // Otherwise: enumerate all users and orgs, then query each
  const owners = await getAllOwners(api);
  const results = [];

  for (const owner of owners) {
    try {
      const pkgs = await getPackagesForOwner(api, owner, type, limit);
      if (Array.isArray(pkgs) && pkgs.length > 0) {
        results.push(...pkgs);
      }
    } catch (_) {
      // Skip owners we can't access
    }
  }

  return results;
}

async function getAllOwners(api) {
  const [users, orgs] = await Promise.all([
    api('/api/v1/admin/users?limit=50').catch(() => []),
    api('/api/v1/admin/orgs?limit=50').catch(() => []),
  ]);

  const names = new Set();
  for (const u of users) if (u.login) names.add(u.login);
  for (const o of orgs) if (o.username) names.add(o.username);
  return [...names];
}

async function getPackagesForOwner(api, owner, type, limit) {
  let endpoint = `/api/v1/packages/${encodeURIComponent(owner)}?limit=${limit}`;
  if (type) endpoint += `&type=${encodeURIComponent(type)}`;

  const raw = await api(endpoint);
  if (!Array.isArray(raw)) return [];

  return raw.map(pkg => ({
    _columns: ['owner', 'type', 'name', 'version', 'created'],
    owner: pkg.owner?.login || owner,
    type: pkg.type || '',
    name: pkg.name || '',
    version: pkg.version || '',
    created: (pkg.created_at || '').slice(0, 10),
    id: pkg.id,
    html_url: pkg.html_url || '',
    repository: pkg.repository?.full_name || '',
    creator: pkg.creator?.login || '',
  }));
}

module.exports = packages;
