// ghcr.io OAuth token 缓存（按 formula 缓存）
const tokenCache = new Map();

async function getGHCRToken(formula) {
  const now = Date.now();
  const cached = tokenCache.get(formula);

  // 使用缓存的 token（提前 60 秒刷新）
  if (cached && now < cached.expiry - 60000) {
    return cached.token;
  }

  // 获取新 token（特定 formula 的 scope）
  const authUrl = `https://ghcr.io/token?scope=repository:homebrew/core/${formula}:pull`;
  const response = await fetch(authUrl);

  if (!response.ok) return null;

  const data = await response.json();

  // 缓存 token（5 分钟有效）
  tokenCache.set(formula, {
    token: data.token,
    expiry: now + (data.expires_in || 300) * 1000
  });

  return data.token;
}

export async function handleBottleDownload(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 匹配: /ghcr.io/v2/homebrew/core/<formula>-<version>.<arch>.bottle.tar.gz
  const match = path.match(/\/ghcr\.io\/v2\/homebrew\/core\/(.+?)-([\d.]+(?:_\d+)?)\.([\w_]+)\.bottle\.tar\.gz$/);

  if (!match) {
    if (__DEBUG__) console.log('[Bottle] No match for path:', path);
    return null;
  }

  const [, formula, version, arch] = match;
  if (__DEBUG__) console.log('[Bottle] Matched:', { formula, version, arch });

  try {
    const token = await getGHCRToken(formula);
    if (!token) {
      if (__DEBUG__) console.log('[Bottle] Failed to get token');
      return null;
    }

    if (__DEBUG__) console.log('[Bottle] Got token, fetching manifest');

    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. 获取 manifest
    const manifestUrl = `https://ghcr.io/v2/homebrew/core/${formula}/manifests/${version}`;
    const manifestResp = await fetch(manifestUrl, {
      headers: { ...headers, 'Accept': 'application/vnd.oci.image.index.v1+json' }
    });

    if (!manifestResp.ok) {
      if (__DEBUG__) console.log('[Bottle] Manifest failed:', manifestResp.status);
      return null;
    }

    const manifest = await manifestResp.json();
    if (__DEBUG__) console.log('[Bottle] Got manifest with', manifest.manifests?.length, 'items');

    // 2. 找到匹配架构的 digest
    let blobDigest = null;
    for (const m of manifest.manifests || []) {
      const refName = m.annotations?.['org.opencontainers.image.ref.name'] || '';
      if (refName.includes(arch)) {
        blobDigest = m.digest;
        if (__DEBUG__) console.log('[Bottle] Found digest for', arch, ':', blobDigest);
        break;
      }
    }

    if (!blobDigest) {
      if (__DEBUG__) console.log('[Bottle] No digest found for arch:', arch);
      return null;
    }

    // 3. 获取 layer manifest
    const layerManifestUrl = `https://ghcr.io/v2/homebrew/core/${formula}/manifests/${blobDigest}`;
    const layerResp = await fetch(layerManifestUrl, {
      headers: {
        ...headers,
        'Accept': 'application/vnd.oci.image.manifest.v1+json'
      }
    });

    if (!layerResp.ok) {
      if (__DEBUG__) console.log('[Bottle] Layer manifest failed:', layerResp.status);
      return null;
    }

    const layerManifest = await layerResp.json();
    const layer = layerManifest.layers?.[0];

    if (!layer) {
      if (__DEBUG__) console.log('[Bottle] No layers found');
      return null;
    }

    if (__DEBUG__) console.log('[Bottle] Layer digest:', layer.digest, 'size:', layer.size);

    // 4. 下载 blob
    const blobUrl = `https://ghcr.io/v2/homebrew/core/${formula}/blobs/${layer.digest}`;
    const blobResp = await fetch(blobUrl, { headers });

    if (!blobResp.ok) {
      if (__DEBUG__) console.log('[Bottle] Blob download failed:', blobResp.status);
      return null;
    }

    if (__DEBUG__) console.log('[Bottle] Success! Returning blob');

    // 5. 返回响应
    return new Response(blobResp.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': layer.size?.toString() || ''
      }
    });
  } catch (error) {
    if (__DEBUG__) console.log('[Bottle] Error:', error.message);
    return null;
  }
}
