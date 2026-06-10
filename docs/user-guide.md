# 用户配置指南

配置 Homebrew 使用反向代理加速访问。

## macOS 配置

### Zsh（默认 Shell）

在终端执行以下命令：

```bash
# 替换 your-worker.workers.dev 为你的实际 Worker URL
export WORKER_URL="your-worker.workers.dev"

cat >> ~/.zshrc <<EOF
# Homebrew 反向代理配置
export HOMEBREW_BREW_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/brew"
export HOMEBREW_CORE_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/homebrew-core"
export HOMEBREW_BOTTLE_DOMAIN="https://${WORKER_URL}/ghcr.io/v2/homebrew/core"
export HOMEBREW_API_DOMAIN="https://${WORKER_URL}/formulae.brew.sh/api"
EOF

source ~/.zshrc
```

### Bash（旧版 macOS）

```bash
export WORKER_URL="your-worker.workers.dev"

cat >> ~/.bash_profile <<EOF
# Homebrew 反向代理配置
export HOMEBREW_BREW_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/brew"
export HOMEBREW_CORE_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/homebrew-core"
export HOMEBREW_BOTTLE_DOMAIN="https://${WORKER_URL}/ghcr.io/v2/homebrew/core"
export HOMEBREW_API_DOMAIN="https://${WORKER_URL}/formulae.brew.sh/api"
EOF

source ~/.bash_profile
```

## Linux 配置

### Bash

```bash
export WORKER_URL="your-worker.workers.dev"

cat >> ~/.bashrc <<EOF
# Homebrew 反向代理配置
export HOMEBREW_BREW_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/brew"
export HOMEBREW_CORE_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/homebrew-core"
export HOMEBREW_BOTTLE_DOMAIN="https://${WORKER_URL}/ghcr.io/v2/homebrew/core"
export HOMEBREW_API_DOMAIN="https://${WORKER_URL}/formulae.brew.sh/api"
EOF

source ~/.bashrc
```

### Zsh

```bash
export WORKER_URL="your-worker.workers.dev"

cat >> ~/.zshrc <<EOF
# Homebrew 反向代理配置
export HOMEBREW_BREW_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/brew"
export HOMEBREW_CORE_GIT_REMOTE="https://${WORKER_URL}/github.com/Homebrew/homebrew-core"
export HOMEBREW_BOTTLE_DOMAIN="https://${WORKER_URL}/ghcr.io/v2/homebrew/core"
export HOMEBREW_API_DOMAIN="https://${WORKER_URL}/formulae.brew.sh/api"
EOF

source ~/.zshrc
```

## 验证配置

### 1. 检查环境变量

```bash
env | grep HOMEBREW
```

应该看到 4 个 `HOMEBREW_*` 变量指向你的 Worker URL。

### 2. 测试 Homebrew

```bash
brew update
```

如果配置正确，更新会通过你的代理进行。

### 3. 测试安装

```bash
brew install wget
```

观察下载 URL，应该是你的 Worker 域名。

## 恢复默认配置

如果需要恢复使用 Homebrew 官方源：

```bash
# 删除环境变量
unset HOMEBREW_BREW_GIT_REMOTE
unset HOMEBREW_CORE_GIT_REMOTE
unset HOMEBREW_BOTTLE_DOMAIN
unset HOMEBREW_API_DOMAIN

# 编辑配置文件，删除相关行
# macOS Zsh: ~/.zshrc
# macOS Bash: ~/.bash_profile
# Linux: ~/.bashrc 或 ~/.zshrc
```

## CI/CD 配置

### GitHub Actions

```yaml
- name: 配置 Homebrew 代理
  run: |
    echo "HOMEBREW_BREW_GIT_REMOTE=https://your-worker.workers.dev/github.com/Homebrew/brew" >> $GITHUB_ENV
    echo "HOMEBREW_CORE_GIT_REMOTE=https://your-worker.workers.dev/github.com/Homebrew/homebrew-core" >> $GITHUB_ENV
    echo "HOMEBREW_BOTTLE_DOMAIN=https://your-worker.workers.dev/ghcr.io/v2/homebrew/core" >> $GITHUB_ENV
    echo "HOMEBREW_API_DOMAIN=https://your-worker.workers.dev/formulae.brew.sh/api" >> $GITHUB_ENV
```

### GitLab CI

```yaml
variables:
  HOMEBREW_BREW_GIT_REMOTE: "https://your-worker.workers.dev/github.com/Homebrew/brew"
  HOMEBREW_CORE_GIT_REMOTE: "https://your-worker.workers.dev/github.com/Homebrew/homebrew-core"
  HOMEBREW_BOTTLE_DOMAIN: "https://your-worker.workers.dev/ghcr.io/v2/homebrew/core"
  HOMEBREW_API_DOMAIN: "https://your-worker.workers.dev/formulae.brew.sh/api"
```

## Docker 容器配置

在 Dockerfile 中：

```dockerfile
ENV HOMEBREW_BREW_GIT_REMOTE="https://your-worker.workers.dev/github.com/Homebrew/brew"
ENV HOMEBREW_CORE_GIT_REMOTE="https://your-worker.workers.dev/github.com/Homebrew/homebrew-core"
ENV HOMEBREW_BOTTLE_DOMAIN="https://your-worker.workers.dev/ghcr.io/v2/homebrew/core"
ENV HOMEBREW_API_DOMAIN="https://your-worker.workers.dev/formulae.brew.sh/api"
```

或使用 docker-compose.yml：

```yaml
services:
  app:
    environment:
      - HOMEBREW_BREW_GIT_REMOTE=https://your-worker.workers.dev/github.com/Homebrew/brew
      - HOMEBREW_CORE_GIT_REMOTE=https://your-worker.workers.dev/github.com/Homebrew/homebrew-core
      - HOMEBREW_BOTTLE_DOMAIN=https://your-worker.workers.dev/ghcr.io/v2/homebrew/core
      - HOMEBREW_API_DOMAIN=https://your-worker.workers.dev/formulae.brew.sh/api
```

## 注意事项

1. **URL 格式**：确保使用 `https://` 前缀
2. **不要尾部斜杠**：URL 结尾不要加 `/`
3. **生效时间**：配置后需要重启终端或执行 `source` 命令
4. **权限**：某些系统可能需要 `sudo` 权限修改配置文件
