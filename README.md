# Cloudflare Worker Homebrew 反向代理

加速 Homebrew 访问的 Cloudflare Workers 反向代理，具备爬虫检测和 nginx 伪装功能。

## 快速开始

### 部署

1. 安装 Wrangler CLI：
```bash
npm install -g wrangler
```

2. 登录 Cloudflare：
```bash
wrangler login
```

3. 部署：
```bash
npm run deploy
```

部署成功后，Wrangler 会输出你的 Worker URL，格式为：`https://<worker-name>.<subdomain>.workers.dev`

记录这个 URL，用于下面的用户配置步骤。

### 配置

在 Cloudflare Dashboard 中设置环境变量：

- `CACHE_ENABLED`: 启用缓存（默认 `false`）
- `CACHE_BOTTLES`: 仅缓存 bottles（默认 `false`）
- `CACHE_TTL`: 缓存时间秒数（默认 `3600`）
- `WHITELIST_IPS`: IP 白名单，支持 IPv4/IPv6 CIDR（如 `192.168.1.0/24,2001:db8::/32`）

### 用户配置

**重要**：将下面命令中的 `your-worker.workers.dev` 替换为你部署后获得的实际 Worker URL。

#### macOS (Zsh)

```bash
echo 'export HOMEBREW_BREW_GIT_REMOTE="https://your-worker.workers.dev/github.com/Homebrew/brew"' >> ~/.zshrc
echo 'export HOMEBREW_CORE_GIT_REMOTE="https://your-worker.workers.dev/github.com/Homebrew/homebrew-core"' >> ~/.zshrc
echo 'export HOMEBREW_BOTTLE_DOMAIN="https://your-worker.workers.dev/ghcr.io/v2/homebrew/core"' >> ~/.zshrc
echo 'export HOMEBREW_API_DOMAIN="https://your-worker.workers.dev/formulae.brew.sh/api"' >> ~/.zshrc
source ~/.zshrc
```

#### Linux (Bash)

```bash
cat >> ~/.bashrc <<'EOF'
export HOMEBREW_BREW_GIT_REMOTE="https://your-worker.workers.dev/github.com/Homebrew/brew"
export HOMEBREW_CORE_GIT_REMOTE="https://your-worker.workers.dev/github.com/Homebrew/homebrew-core"
export HOMEBREW_BOTTLE_DOMAIN="https://your-worker.workers.dev/ghcr.io/v2/homebrew/core"
export HOMEBREW_API_DOMAIN="https://your-worker.workers.dev/formulae.brew.sh/api"
EOF
source ~/.bashrc
```

## 功能

- ✅ 反向代理所有 Homebrew 域名
- ✅ 检测并拦截爬虫和扫描器
- ✅ 返回 nginx 伪装响应
- ✅ 可选的边缘缓存
- ✅ IP 白名单支持（IPv4/IPv6 CIDR）

## 高级配置

### 启用缓存

在 Cloudflare Dashboard 的 Worker 设置中添加环境变量：

```
CACHE_ENABLED=true
CACHE_TTL=7200
```

### 仅缓存 Bottles

如果只想缓存预编译的二进制包（bottles）：

```
CACHE_BOTTLES=true
```

### IP 白名单

信任的 IP 地址可以绕过所有检测。支持 CIDR 表示法：

```
WHITELIST_IPS=192.168.1.0/24,10.0.0.50,2001:db8::/32
```

## 工作原理

### 请求检测

代理使用多层检测机制：

1. **IP 白名单优先** - 白名单 IP 直接放行
2. **Homebrew 客户端识别** - User-Agent 包含 "homebrew" 放行
3. **User-Agent 黑名单** - 拦截已知爬虫/扫描器（nmap、curl、wget 等）
4. **Header 检查** - 缺少 `Accept-Language` 或 `Accept-Encoding` 的请求被拦截
5. **默认放行** - 通过所有检测的正常请求

### URL 格式

访问格式：`https://your-worker.workers.dev/<domain>/<path>`

示例：
- `https://your-worker.workers.dev/formulae.brew.sh/api/formula.json`
- `https://your-worker.workers.dev/ghcr.io/v2/homebrew/core/wget/manifests/1.21.3`

## 测试

### 本地开发

```bash
npm run dev
```

服务器启动在 `http://localhost:8787`

### 测试命令

```bash
# 测试欢迎页
curl -H "Accept-Language: en-US" http://localhost:8787/

# 测试爬虫拦截
curl -A "nmap" http://localhost:8787/formulae.brew.sh/api/formula.json

# 测试正常代理
curl -A "Homebrew/4.0.0" -H "Accept-Language: en-US" \
  http://localhost:8787/formulae.brew.sh/api/formula/wget.json
```

## 故障排除

### 问题：无法访问某些域名

确认 `src/config.js` 中的 `HOMEBREW_DOMAINS` 包含所需域名。添加新域名：

```javascript
export const HOMEBREW_DOMAINS = {
  'formulae.brew.sh': 'https://formulae.brew.sh',
  'new-domain.com': 'https://new-domain.com'  // 添加这行
};
```

### 问题：合法请求被拦截

检查请求是否包含必要的 headers。Homebrew 客户端会自动添加，但自定义脚本需要：

```bash
curl -H "Accept-Language: en-US" -H "Accept-Encoding: gzip" ...
```

或将你的 IP 添加到白名单。

## 许可

MIT
