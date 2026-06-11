// Homebrew 域名映射表
export const HOMEBREW_DOMAINS = {
  'formulae.brew.sh': 'https://formulae.brew.sh',
  'api.github.com': 'https://api.github.com',
  'raw.githubusercontent.com': 'https://raw.githubusercontent.com',
  'ghcr.io': 'https://ghcr.io',
  'ghcr.io/v2/homebrew/core': 'https://ghcr.io/v2/homebrew/core',
  'pkg-containers.githubusercontent.com': 'https://pkg-containers.githubusercontent.com',
  'github.com': 'https://github.com',
  'codeload.github.com': 'https://codeload.github.com'
};

// 读取环境变量配置
export function getConfig(env) {
  return {
    cacheEnabled: env.CACHE_ENABLED === 'true',
    cacheBottles: env.CACHE_BOTTLES === 'true',
    cacheTTL: parseInt(env.CACHE_TTL || '3600', 10),
    whitelistIPs: env.WHITELIST_IPS ? env.WHITELIST_IPS.split(',').map(ip => ip.trim()) : []
  };
}
