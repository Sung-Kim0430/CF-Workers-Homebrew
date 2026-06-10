const BLOCKED_UA_PATTERNS = [
  /nmap/i,
  /masscan/i,
  /zmeu/i,
  /sqlmap/i,
  /nikto/i,
  /acunetix/i,
  /curl\//i,
  /wget\//i,
  /python-requests\//i,
  /go-http-client\//i,
  /googlebot/i,
  /bingbot/i,
  /baiduspider/i,
  /yisouspider/i,
  /sogou/i,
  /360spider/i,
  /bytespider/i,
  /yandex/i,
  /slurp/i,
  /twitterbot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /netcraft/i,
  /openai/i,
  /adidxbot/i,
  /spawning/i,
  /rogerbot/i,
  /quora/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /bot/i
];

// IPv4 CIDR 匹配
function ipToInt(ip) {
  return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
}

function parseCIDRv4(cidr) {
  const [ip, bits] = cidr.split('/');
  const mask = bits ? ~((1 << (32 - parseInt(bits, 10))) - 1) : 0xffffffff;
  return { network: ipToInt(ip) & mask, mask };
}

// IPv6 CIDR 匹配
function ipv6ToSegments(ip) {
  // 展开缩写形式（::）
  const parts = ip.split('::');
  if (parts.length === 2) {
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0');
    return [...left, ...middle, ...right].map(s => parseInt(s || '0', 16));
  }
  return ip.split(':').map(s => parseInt(s || '0', 16));
}

function matchIPv6CIDR(ip, cidr) {
  const [network, bits] = cidr.split('/');
  const prefixLen = parseInt(bits || '128', 10);

  const ipSegs = ipv6ToSegments(ip);
  const netSegs = ipv6ToSegments(network);

  // 按位比较前缀
  let bitsToCheck = prefixLen;
  for (let i = 0; i < 8 && bitsToCheck > 0; i++) {
    const bitsInSegment = Math.min(16, bitsToCheck);
    const mask = (0xffff << (16 - bitsInSegment)) & 0xffff;

    if ((ipSegs[i] & mask) !== (netSegs[i] & mask)) {
      return false;
    }
    bitsToCheck -= 16;
  }
  return true;
}

function isIPWhitelisted(ip, whitelist) {
  if (!ip || whitelist.length === 0) return false;

  const isIPv6Address = ip.includes(':');

  return whitelist.some(entry => {
    // IPv6 CIDR 匹配
    if (isIPv6Address) {
      if (entry.includes('/')) {
        return matchIPv6CIDR(ip, entry);
      }
      return ip === entry;
    }

    // IPv4 CIDR 匹配
    if (entry.includes('/')) {
      const { network, mask } = parseCIDRv4(entry);
      const ipInt = ipToInt(ip);
      return (ipInt & mask) === network;
    }

    // 精确匹配
    return ip === entry;
  });
}

export function detectRequest(request, config) {
  const ua = request.headers.get('User-Agent') || '';
  const clientIP = request.headers.get('CF-Connecting-IP');

  // 1. 检查白名单
  if (isIPWhitelisted(clientIP, config.whitelistIPs)) {
    return { isSuspicious: false, reason: 'ip-whitelisted', action: 'allow' };
  }

  // 2. 检查 Homebrew 客户端（合法）
  if (/homebrew/i.test(ua)) {
    return { isSuspicious: false, reason: 'homebrew-client', action: 'allow' };
  }

  // 3. User-Agent 黑名单
  for (const pattern of BLOCKED_UA_PATTERNS) {
    if (pattern.test(ua)) {
      return { isSuspicious: true, reason: 'blocked-ua', action: 'block' };
    }
  }

  // 4. 检查关键 headers 缺失
  const hasAcceptLang = request.headers.has('Accept-Language');
  const hasAcceptEnc = request.headers.has('Accept-Encoding');

  if (!hasAcceptLang || !hasAcceptEnc) {
    return { isSuspicious: true, reason: 'missing-headers', action: 'block' };
  }

  // 5. 默认允许
  return { isSuspicious: false, reason: 'normal-request', action: 'allow' };
}
