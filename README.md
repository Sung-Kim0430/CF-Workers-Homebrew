# Cloudflare Worker Homebrew 反向代理

加速 Homebrew 访问的 Cloudflare Workers 反向代理，具备爬虫检测和 nginx 伪装功能。

## 快速开始

### 1. 部署到 Cloudflare

```bash
npm install -g wrangler
wrangler login
npm run deploy
```

记录部署后输出的 Worker URL（如 `https://homebrew-proxy.your-subdomain.workers.dev`）

📖 **详细步骤**：[部署指南](docs/deployment.md)

### 2. 配置 Homebrew

替换下面的 `your-worker.workers.dev` 为你的实际 Worker URL：

**macOS/Linux:**
```bash
export WORKER_URL="your-worker.workers.dev"
cat >> ~/.zshrc <<EOF
export HOMEBREW_BREW_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/brew"
export HOMEBREW_CORE_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/homebrew-core"
export HOMEBREW_BOTTLE_DOMAIN="https://${WORKER_URL}/ghcr.io/v2/homebrew/core"
export HOMEBREW_API_DOMAIN="https://${WORKER_URL}/formulae.brew.sh/api"
EOF
source ~/.zshrc
```

📖 **更多平台配置**：[用户指南](docs/user-guide.md)

### 3. 验证

```bash
brew update
```

## 功能特性

- ✅ 反向代理所有 Homebrew 域名
- ✅ 智能检测并拦截爬虫/扫描器
- ✅ 返回 nginx 伪装响应
- ✅ 可选边缘缓存（bottles/全局）
- ✅ IP 白名单（IPv4/IPv6 CIDR）

## 文档

- 📖 [部署指南](docs/deployment.md) - 详细部署步骤、环境变量配置
- 📖 [用户指南](docs/user-guide.md) - macOS/Linux/CI 配置方法
- 📖 [故障排除](docs/troubleshooting.md) - 常见问题和解决方案
- 📖 [架构设计](docs/superpowers/specs/2026-06-10-cloudflare-worker-homebrew-proxy-design.md) - 技术细节

## 快速配置

### 启用缓存

在 Cloudflare Dashboard 添加环境变量：
```
CACHE_ENABLED=true
CACHE_TTL=7200
```

### IP 白名单

```
WHITELIST_IPS=192.168.1.0/24,10.0.0.5,2001:db8::/32
```

📖 **更多配置**：[部署指南 - 环境变量配置](docs/deployment.md#环境变量配置)

## 本地开发

```bash
npm install
npm run dev
```

访问 `http://localhost:8787`

## 许可

MIT
