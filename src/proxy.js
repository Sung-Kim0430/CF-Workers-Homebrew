import { HOMEBREW_DOMAINS } from './config.js';

function parseTargetDomain(url) {
  const path = new URL(url).pathname;
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const domain = segments[0];

  if (!HOMEBREW_DOMAINS[domain]) return null;

  const remainingPath = '/' + segments.slice(1).join('/');

  return { domain, remainingPath };
}

export async function proxyRequest(request) {
  const url = new URL(request.url);
  const parsed = parseTargetDomain(request.url);

  if (!parsed) {
    return new Response('Invalid target domain', { status: 400 });
  }

  const { domain, remainingPath } = parsed;
  const targetURL = HOMEBREW_DOMAINS[domain] + remainingPath + url.search;

  // 复制 headers（除了 Host）
  const headers = new Headers(request.headers);
  headers.delete('Host');

  // 转发请求（body 只能读取一次，直接传递）
  const response = await fetch(targetURL, {
    method: request.method,
    headers: headers,
    body: request.body
  });

  // 返回响应
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
