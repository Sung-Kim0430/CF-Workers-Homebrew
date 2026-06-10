export async function getCachedResponse(request, config) {
  if (!config.cacheEnabled && !config.cacheBottles) return null;

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });

  return await cache.match(cacheKey);
}

export async function cacheResponse(request, response, config) {
  if (!config.cacheEnabled && !config.cacheBottles) return;

  // 只缓存成功的 GET 请求
  if (request.method !== 'GET' || response.status < 200 || response.status >= 300) {
    return;
  }

  // 如果只缓存 bottles
  if (config.cacheBottles && !config.cacheEnabled) {
    const url = new URL(request.url);
    if (!/\.(tar\.gz|bottle\.tar\.gz)$/i.test(url.pathname)) {
      return;
    }
  }

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });

  // 克隆响应并添加缓存控制
  const responseToCache = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });

  responseToCache.headers.set('Cache-Control', `public, max-age=${config.cacheTTL}`);

  await cache.put(cacheKey, responseToCache);
}
