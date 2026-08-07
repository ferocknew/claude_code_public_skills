// Nexus3 REST API 请求封装（Basic Auth）
// 官方 API 前缀：/service/rest/v1/

// 自签名证书跳过支持。
// Node18+ 全局 fetch 基于 undici，无法按请求设置 rejectUnauthorized，
// 故仅在显式配置 NEXUS_REJECT_UNAUTHORIZED=false 时通过环境变量全局放开（影响整个进程）。
if (process.env.NEXUS_REJECT_UNAUTHORIZED === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * 发起 Nexus3 REST API 请求
 * @param {string} endpoint - 接口路径，形如 '/service/rest/v1/repositories'
 * @param {object} options - fetch options（method/body/headers）
 * @returns {Promise<object|string|null>} JSON 对象、文本；204 返回 null
 */
async function api(endpoint, options = {}) {
  const baseUrl = (process.env.NEXUS_URL || '').replace(/\/+$/, '');

  if (!baseUrl) {
    throw new Error(
      'NEXUS_URL 未设置。请 export NEXUS_URL="https://your-nexus.example.com" 或在本 skill 目录的 .env 中配置'
    );
  }

  const url = `${baseUrl}${endpoint}`;
  const headers = { ...options.headers };

  // Nexus3 REST API 主要使用 Basic Auth
  const username = process.env.NEXUS_USERNAME || '';
  const password = process.env.NEXUS_PASSWORD || '';
  if (username) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    headers['Authorization'] = `Basic ${token}`;
  }

  // 超时控制（默认 30s，避免网络异常时无限挂起；可经 NEXUS_TIMEOUT 调整）
  const timeoutMs = parseInt(process.env.NEXUS_TIMEOUT || '30000', 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(
        `请求超时（${timeoutMs}ms）：${url}（可经 NEXUS_TIMEOUT 调整，或检查网络/代理/证书）`
      );
    }
    const hint =
      process.env.NEXUS_REJECT_UNAUTHORIZED === 'false'
        ? ''
        : '（若为自签名证书，可在 .env 设 NEXUS_REJECT_UNAUTHORIZED=false）';
    throw new Error(`请求失败：${e.message}${hint}`);
  } finally {
    clearTimeout(timer);
  }

  // 204 No Content —— DELETE 成功
  if (res.status === 204) return null;

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text;
    // Nexus3 错误响应通常是 JSON：{ "message": "..." } 或 HTML 错误页
    try {
      const j = JSON.parse(text);
      message = j.message || j.error || text;
    } catch (_) {}
    const err = new Error(`API error ${res.status}: ${message || res.statusText}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    return await res.json();
  }
  return await res.text();
}

module.exports = api;
