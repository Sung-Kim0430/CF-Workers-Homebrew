import { getConfig } from './config.js';
import { detectRequest } from './detector.js';
import { generateWelcomePage, generate403Page } from './responses.js';
import { proxyRequest } from './proxy.js';
import { getCachedResponse, cacheResponse } from './cache.js';
import { handleBottleDownload } from './bottle.js';

export default {
  async fetch(request, env, ctx) {
    const config = getConfig(env);
    const url = new URL(request.url);

    // 检测请求
    const detection = detectRequest(request, config);

    // 可疑请求：返回 403
    if (detection.isSuspicious) {
      return generate403Page();
    }

    // 访问根路径且是正常浏览器：返回欢迎页
    if (url.pathname === '/') {
      const ua = request.headers.get('User-Agent') || '';
      const isBrowser = request.headers.has('Accept-Language') && !/homebrew/i.test(ua);

      if (isBrowser) {
        return generateWelcomePage();
      }
    }

    // 特殊处理：bottle 下载
    if (url.pathname.includes('.bottle.tar.gz')) {
      const bottleResp = await handleBottleDownload(request);
      if (bottleResp) return bottleResp;
    }

    // 正常代理请求
    try {
      // 检查缓存
      const cached = await getCachedResponse(request, config);
      if (cached) {
        return cached;
      }

      // 代理请求
      const response = await proxyRequest(request);

      // 克隆响应用于缓存（后台执行）
      ctx.waitUntil(cacheResponse(request, response.clone(), config));

      return response;
    } catch (error) {
      return new Response(`Proxy error: ${error.message}`, { status: 500 });
    }
  }
};
