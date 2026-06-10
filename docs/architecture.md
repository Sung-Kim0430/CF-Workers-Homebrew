# 架构设计

## 概览

```
┌─────────────┐
│   Homebrew  │
│   客户端    │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────┐
│    Cloudflare Workers Edge          │
│  ┌───────────────────────────────┐  │
│  │  index.js (入口)              │  │
│  │    ├─ detector.js (检测)     │  │
│  │    ├─ responses.js (伪装)    │  │
│  │    ├─ proxy.js (代理)        │  │
│  │    ├─ cache.js (缓存)        │  │
│  │    └─ config.js (配置)       │  │
│  └───────────────────────────────┘  │
└──────┬──────────────────────────────┘
       │ HTTPS
       ▼
┌─────────────────┐
│  Homebrew 上游  │
│  (GitHub, etc)  │
└─────────────────┘
```

## 核心模块

### 1. index.js - 入口路由

**职责**：
- 接收所有请求
- 调用检测模块
- 根据检测结果分发请求

**请求流程**：
```javascript
Request → detectRequest() 
        ├─ isSuspicious? → generate403Page()
        ├─ isRootPath? → generateWelcomePage()
        └─ else → proxyRequest()
```

### 2. detector.js - 威胁检测

**检测层级**（优先级从高到低）：

1. **IP 白名单**（最高优先级）
   - 检查 `CF-Connecting-IP` header
   - 支持 IPv4/IPv6 CIDR 匹配
   - 白名单 IP 跳过所有后续检测

2. **Homebrew 客户端识别**
   - 检测 User-Agent 包含 `homebrew`
   - 合法客户端直接放行

3. **User-Agent 黑名单**
   - 扫描器：nmap, masscan, nikto
   - 自动化工具：curl, wget, python-requests
   - 爬虫：googlebot, bingbot, baiduspider

4. **Header 完整性**
   - 必须包含 `Accept-Language`
   - 必须包含 `Accept-Encoding`

5. **默认策略**
   - 通过所有检测则放行

**CIDR 匹配算法**：

IPv4：
```javascript
网络地址 = IP & 掩码
匹配 = (请求IP & 掩码) === 网络地址
```

IPv6：
```javascript
1. 展开 :: 缩写（补齐 8 个段）
2. 按位比较前缀长度
3. 使用掩码提取每段的前 N 位
```

### 3. proxy.js - 反向代理

**URL 解析**：
```
输入：https://worker.dev/formulae.brew.sh/api/formula.json
               ↓
解析：domain = 'formulae.brew.sh'
     path = '/api/formula.json'
               ↓
映射：HOMEBREW_DOMAINS[domain] + path
               ↓
输出：https://formulae.brew.sh/api/formula.json
```

**请求转发**：
- 复制原始 headers（除 Host）
- 直接传递 request.body（避免重复读取）
- 保留原始 HTTP 方法

### 4. responses.js - 响应生成

**nginx 伪装**：
- 欢迎页：标准 nginx HTML（200）
- 403 页面：nginx 风格错误页
- Server header：`nginx/1.24.0`

**触发条件**：
- 欢迎页：根路径 + 正常浏览器
- 403：检测到可疑请求

### 5. cache.js - 缓存层

**缓存策略**：

| 配置 | 行为 |
|------|------|
| `CACHE_ENABLED=true` | 缓存所有成功的 GET 请求 |
| `CACHE_BOTTLES=true` | 仅缓存 `.tar.gz` / `.bottle.tar.gz` |
| 两者都 false | 禁用缓存 |

**缓存键**：
```javascript
new Request(request.url, { method: 'GET' })
```

**缓存控制**：
```javascript
Cache-Control: public, max-age=${CACHE_TTL}
```

**异步写入**：
```javascript
ctx.waitUntil(cacheResponse(...))
```
不阻塞响应返回。

### 6. config.js - 配置管理

**域名映射**：
```javascript
HOMEBREW_DOMAINS = {
  'formulae.brew.sh': 'https://formulae.brew.sh',
  'github.com': 'https://github.com',
  // ...
}
```

**环境变量读取**：
```javascript
getConfig(env) → {
  cacheEnabled: boolean,
  cacheBottles: boolean,
  cacheTTL: number,
  whitelistIPs: string[]
}
```

## 数据流

### 正常请求流

```
1. Homebrew 客户端发送请求
   ↓
2. Cloudflare Edge 接收
   ↓
3. detector.js 检测
   - 检查 UA：/homebrew/i 匹配
   - 返回：{ isSuspicious: false }
   ↓
4. cache.js 检查缓存
   - 未命中
   ↓
5. proxy.js 转发请求
   - 解析域名
   - 构建上游 URL
   - 发起 fetch()
   ↓
6. 上游返回响应
   ↓
7. cache.js 异步缓存（后台）
   ↓
8. 返回响应给客户端
```

### 可疑请求流

```
1. 扫描器/爬虫发送请求
   ↓
2. Cloudflare Edge 接收
   ↓
3. detector.js 检测
   - 检查 UA：匹配黑名单
   - 返回：{ isSuspicious: true, reason: 'blocked-ua' }
   ↓
4. responses.js 生成 403
   ↓
5. 直接返回（不经过代理）
```

## 性能优化

### 1. 边缘缓存
- Cloudflare 全球 CDN
- 减少上游请求
- 降低延迟

### 2. 后台缓存写入
```javascript
ctx.waitUntil(cacheResponse(...))
```
不阻塞主响应。

### 3. Response 克隆
```javascript
response.clone()
```
允许响应体被多次使用（缓存 + 返回）。

### 4. 最小依赖
- 零外部依赖
- 脚本大小 < 50KB
- 冷启动快

## 安全考虑

### 1. 请求伪造防护
- 检查多个 header
- UA 黑名单
- 行为特征检测

### 2. DDoS 防护
- Cloudflare 内置防护
- 可疑请求不到达上游
- IP 白名单机制

### 3. 信息泄露防护
- nginx 伪装响应
- 不暴露真实后端
- 错误信息标准化

### 4. 供应链安全
- 无外部依赖
- 代码可审计
- 开源透明

## 限制

### Cloudflare Workers 限制

| 项目 | 免费计划 | 付费计划 |
|------|----------|----------|
| 请求数 | 10万/天 | 1000万/月（首次） |
| CPU 时间 | 10ms/请求 | 50ms/请求 |
| 脚本大小 | 1MB | 10MB |
| 变量数 | 64 | 128 |

### 功能限制

1. **IPv6 CIDR 匹配**
   - 基于段级别比较
   - 不支持复杂的 IPv6 地址格式

2. **缓存大小**
   - 受 Cloudflare 缓存策略限制
   - 大文件可能不缓存

3. **请求体大小**
   - 最大 100MB（Workers 限制）

## 扩展性

### 添加新域名

编辑 `src/config.js`：
```javascript
export const HOMEBREW_DOMAINS = {
  // 现有域名...
  'new-domain.com': 'https://new-domain.com'
};
```

### 自定义检测规则

编辑 `src/detector.js`：
```javascript
const BLOCKED_UA_PATTERNS = [
  // 现有规则...
  /custom-pattern/i
];
```

### 自定义响应

编辑 `src/responses.js`：
```javascript
export function generateCustomPage() {
  return new Response('...', { ... });
}
```

## 监控与日志

### 实时日志
```bash
wrangler tail
```

### Dashboard 指标
- 请求量
- 错误率
- CPU 时间
- 缓存命中率

### 自定义日志
```javascript
console.log('Custom metric:', value);
```

输出到 `wrangler tail` 和 Dashboard。
