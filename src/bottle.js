// ghcr.io OAuth token 缓存（按 scope 缓存）
const tokenCache = new Map();

async function getGHCRToken(scope) {
  const now = Date.now();
  const cached = tokenCache.get(scope);

  // 使用缓存的 token（提前 60 秒刷新）
  if (cached && now < cached.expiry - 60000) {
    return cached.token;
  }

  // 获取新 token
  const authUrl = `https://ghcr.io/token?scope=repository:homebrew/core/${scope}:pull`;
  const response = await fetch(authUrl);

  if (!response.ok) return null;

  const data = await response.json();

  // 缓存 token（5 分钟有效）
  tokenCache.set(scope, {
    token: data.token,
    expiry: now + (data.expires_in || 300) * 1000
  });

  return data.token;
}

export async function handleBottleDownload(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 提取完整的资源路径（用于 token scope）
  // 示例：/ghcr.io/v2/homebrew/core/python/manifests/3.14.6 -> python
  //       /ghcr.io/v2/homebrew/core/python/3.14/manifests/3.14.6 -> python/3.14
  const scopeMatch = path.match(/\/ghcr\.io\/v2\/homebrew\/core\/([^/]+(?:\/[^/]+)?)\/(manifests|blobs)/);
  let scope;

  if (scopeMatch) {
    // manifest/blobs 请求
    scope = scopeMatch[1];
  } else {
    // .tar.gz 文件请求，从文件名提取
    const tarGzMatch = path.match(/\/ghcr\.io\/v2\/homebrew\/core\/(.+?)-([\d.]+(?:_\d+)?)\.([\w_]+)\.bottle\.tar\.gz$/);
    if (!tarGzMatch) return null;

    scope = tarGzMatch[1];

    // 获取 token 并处理下载
    const token = await getGHCRToken(scope);
    if (!token) return null;
    return await handleTarGzDownload(tarGzMatch, token);
  }

  // 获取 OAuth token
  const token = await getGHCRToken(scope);
  if (!token) return null;

  // 转发请求到 ghcr.io
  const upstreamPath = path.replace(/^\/ghcr\.io/, '');
  const upstreamUrl = `https://ghcr.io${upstreamPath}`;

  const upstreamResp = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': request.headers.get('Accept') || 'application/vnd.oci.image.index.v1+json'
    }
  });

  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    headers: upstreamResp.headers
  });
}

// 处理 .tar.gz 文件下载（需要解析 OCI manifest）
async function handleTarGzDownload(match, token) {
  const [, formula, version, arch] = match;

  try {
    const headers = { 'Authorization': `Bearer ${token}` };

    const manifestUrl = `https://ghcr.io/v2/homebrew/core/${formula}/manifests/${version}`;
    const manifestResp = await fetch(manifestUrl, {
      headers: { ...headers, 'Accept': 'application/vnd.oci.image.index.v1+json' }
    });
    if (!manifestResp.ok) return null;

    const manifest = await manifestResp.json();

    let blobDigest = null;
    for (const m of manifest.manifests || []) {
      const refName = m.annotations?.['org.opencontainers.image.ref.name'] || '';
      if (refName.includes(arch)) {
        blobDigest = m.digest;
        break;
      }
    }
    if (!blobDigest) return null;

    const layerManifestUrl = `https://ghcr.io/v2/homebrew/core/${formula}/manifests/${blobDigest}`;
    const layerResp = await fetch(layerManifestUrl, {
      headers: { ...headers, 'Accept': 'application/vnd.oci.image.manifest.v1+json' }
    });
    if (!layerResp.ok) return null;

    const layerManifest = await layerResp.json();
    const layer = layerManifest.layers?.[0];
    if (!layer) return null;

    const blobUrl = `https://ghcr.io/v2/homebrew/core/${formula}/blobs/${layer.digest}`;
    const blobResp = await fetch(blobUrl, { headers });
    if (!blobResp.ok) return null;

    return new Response(blobResp.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': layer.size?.toString() || ''
      }
    });
  } catch (error) {
    return null;
  }
}
