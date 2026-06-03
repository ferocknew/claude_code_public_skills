// Gitea API request wrapper

const GITEA_URL = process.env.GITEA_URL || '';
const GITEA_TOKEN = process.env.GITEA_TOKEN || '';

async function api(endpoint, options = {}) {
  const baseUrl = (process.env.GITEA_URL || GITEA_URL).replace(/\/+$/, '');
  const token = process.env.GITEA_TOKEN || GITEA_TOKEN;

  if (!baseUrl) {
    throw new Error('GITEA_URL not set. Use: export GITEA_URL="https://your-gitea.example.com"');
  }

  const url = `${baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `token ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    return await res.json();
  }
  return await res.text();
}

module.exports = api;
