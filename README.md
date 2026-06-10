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
- ✅ IP 白名单支持

## 许可

MIT
