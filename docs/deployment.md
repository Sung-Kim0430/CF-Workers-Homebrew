# 部署指南

## 部署方式

提供两种部署方式：
1. **推荐：Fork 仓库 + Cloudflare 集成**（自动部署，无需本地配置）
2. **命令行部署**（使用 Wrangler CLI）

---

## 方式 1：Fork + Cloudflare 集成（推荐）

### 优势
- ✅ 无需安装 Node.js 或 Wrangler
- ✅ 自动构建和部署
- ✅ Git push 自动更新
- ✅ 可视化配置

### 步骤

#### 1. Fork 仓库

1. 访问项目仓库
2. 点击右上角 **Fork** 按钮
3. Fork 到你的 GitHub 账号

#### 2. 连接到 Cloudflare

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 点击 **Create application** → **Pages** → **Connect to Git**
4. 授权 Cloudflare 访问你的 GitHub
5. 选择你 Fork 的仓库

#### 3. 配置构建设置

**Build settings:**
- **Framework preset**: `None`
- **Build command**: `npm install`
- **Build output directory**: `/`
- **Root directory**: `/`

点击 **Save and Deploy**

#### 4. 等待部署完成

Cloudflare 会自动：
1. 克隆仓库
2. 安装依赖
3. 部署 Worker
4. 生成 URL

部署完成后，你会看到：
```
https://<project-name>.pages.dev
```

**注意**：Pages 部署后需要将项目转为 Worker。在 Settings 中找到 **Functions** → **Workers compatibility** → 启用。

#### 5. 配置环境变量

在 Cloudflare Dashboard：
1. 进入你的 Worker/Pages 项目
2. **Settings** → **Environment variables**
3. 添加变量（参考下面的环境变量章节）

#### 6. 自动更新

以后只需：
```bash
git add .
git commit -m "Update configuration"
git push
```

Cloudflare 会自动重新部署。

---

## 方式 2：命令行部署

### 前置要求

- Node.js 18+
- npm 或 yarn
- Cloudflare 账号

### 步骤

#### 1. 克隆仓库

```bash
git clone https://github.com/your-username/homebrew-proxy.git
cd homebrew-proxy
```

或使用你 Fork 的仓库地址。

#### 2. 安装依赖

```bash
npm install
```

#### 3. 安装 Wrangler CLI（全局）

```bash
npm install -g wrangler
```

#### 4. 登录 Cloudflare

首次使用需要登录：

```bash
wrangler login
```

这会打开浏览器，授权 Wrangler 访问你的 Cloudflare 账号。

#### 5. 配置 Worker 名称（可选）

编辑 `wrangler.toml`，修改 `name` 字段：

```toml
name = "my-homebrew-proxy"  # 改成你想要的名称
```

#### 6. 部署

```bash
npm run deploy
```

或者使用 Wrangler 直接部署：

```bash
wrangler deploy
```

### 6. 获取 Worker URL

部署成功后，终端会显示：

```
Published homebrew-proxy (1.23 sec)
  https://homebrew-proxy.your-subdomain.workers.dev
```

记录这个 URL。

## 环境变量配置

### 通过 Dashboard 配置

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择 **Workers & Pages** → 你的 Worker
3. 点击 **Settings** → **Variables**
4. 添加环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `CACHE_ENABLED` | `true` 或 `false` | 启用全局缓存 |
| `CACHE_BOTTLES` | `true` 或 `false` | 仅缓存 bottles |
| `CACHE_TTL` | `3600` | 缓存时间（秒） |
| `WHITELIST_IPS` | `192.168.1.0/24,10.0.0.5` | IP 白名单（逗号分隔） |

### 通过命令行配置

使用 `wrangler secret` 设置敏感变量（不推荐用于此项目）：

```bash
wrangler secret put CACHE_ENABLED
```

或在 `wrangler.toml` 中直接配置（会提交到 Git）：

```toml
[vars]
CACHE_ENABLED = "true"
CACHE_TTL = "7200"
```

## 自定义域名（可选）

### 添加自定义域名

1. 在 Cloudflare Dashboard 中，进入 Worker 设置
2. 点击 **Triggers** → **Custom Domains**
3. 添加你的域名（需要在 Cloudflare 管理 DNS）

### 配置 DNS

如果域名不在 Cloudflare：

1. 添加 CNAME 记录指向 `<worker-name>.<subdomain>.workers.dev`
2. 等待 DNS 传播（可能需要几分钟到几小时）

## 验证部署

### 测试欢迎页

```bash
curl -H "Accept-Language: en-US" https://your-worker.workers.dev/
```

应返回 nginx 欢迎页。

### 测试代理功能

```bash
curl -A "Homebrew/4.0.0" -H "Accept-Language: en-US" \
  https://your-worker.workers.dev/formulae.brew.sh/api/formula/wget.json
```

应返回 wget 的 JSON 数据。

## 更新部署

修改代码后重新部署：

```bash
npm run deploy
```

Cloudflare Workers 会自动版本化，支持回滚。

## 监控和日志

### 实时日志

```bash
wrangler tail
```

### Dashboard 查看

在 Cloudflare Dashboard 的 Worker 页面查看：
- 请求量统计
- 错误率
- CPU 使用时间
- 请求分布地图

## 限制

Cloudflare Workers 免费计划限制：
- 每天 100,000 次请求
- CPU 时间每次请求 10ms
- 脚本大小 1MB

超出限制后会返回 1015 错误。升级到付费计划可获得更高额度。
