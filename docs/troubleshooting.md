# 故障排除

## 常见问题

### 1. 部署失败

#### 错误：`Authentication error`

**原因**：未登录 Cloudflare

**解决**：
```bash
wrangler login
```

#### 错误：`Worker name already exists`

**原因**：Worker 名称冲突

**解决**：修改 `wrangler.toml` 中的 `name` 字段：
```toml
name = "homebrew-proxy-unique-name"
```

#### 错误：`Script size exceeds limit`

**原因**：代码超过 1MB 限制

**解决**：检查是否包含了不必要的依赖或文件。

---

### 2. 请求被拦截（403 Forbidden）

#### 症状：正常请求返回 403

**可能原因**：
1. 缺少必要的 HTTP headers
2. User-Agent 在黑名单中
3. IP 不在白名单（如果配置了白名单）

**排查步骤**：

1. **检查 User-Agent**
```bash
curl -v http://localhost:8787/formulae.brew.sh/api/formula.json
```
查看返回的 403 页面。如果 User-Agent 包含 `curl`、`wget` 等关键词会被拦截。

2. **添加必要 headers**
```bash
curl -H "Accept-Language: en-US" -H "Accept-Encoding: gzip" \
  http://localhost:8787/formulae.brew.sh/api/formula.json
```

3. **将 IP 加入白名单**

在 Cloudflare Dashboard 设置：
```
WHITELIST_IPS=你的IP地址
```

查看你的 IP：
```bash
curl ifconfig.me
```

---

### 3. 代理失败（400 Bad Request）

#### 症状：`Invalid target domain`

**原因**：请求的域名不在配置列表中

**解决**：

1. 检查 URL 格式：
```
正确：https://worker.dev/formulae.brew.sh/api/...
错误：https://worker.dev/api/...（缺少域名）
```

2. 添加新域名到 `src/config.js`：
```javascript
export const HOMEBREW_DOMAINS = {
  'formulae.brew.sh': 'https://formulae.brew.sh',
  'new-domain.com': 'https://new-domain.com'  // 添加
};
```

3. 重新部署：
```bash
npm run deploy
```

---

### 4. 缓存问题

#### 症状：旧内容不更新

**原因**：缓存未过期

**解决**：

1. **清除 Cloudflare 缓存**

访问 Dashboard → Worker → **Caching** → **Purge Cache**

2. **降低 TTL**

设置更短的缓存时间：
```
CACHE_TTL=600
```

3. **临时禁用缓存**
```
CACHE_ENABLED=false
CACHE_BOTTLES=false
```

---

### 5. Homebrew 安装失败

#### 症状：`Failed to download`

**排查步骤**：

1. **验证环境变量**
```bash
echo $HOMEBREW_BOTTLE_DOMAIN
```

应该指向你的 Worker URL。

2. **测试代理连接**
```bash
curl -I https://your-worker.workers.dev/ghcr.io/v2/
```

应该返回 200 或 30x 状态码。

3. **检查 Worker 日志**
```bash
wrangler tail
```

查看是否有错误。

4. **临时使用官方源**
```bash
unset HOMEBREW_BOTTLE_DOMAIN
brew install <package>
```

---

### 6. 性能问题

#### 症状：请求很慢

**可能原因**：
1. 冷启动（第一次请求）
2. 上游服务器慢
3. 未启用缓存

**优化建议**：

1. **启用缓存**
```
CACHE_ENABLED=true
CACHE_TTL=7200
```

2. **只缓存 bottles（大文件）**
```
CACHE_BOTTLES=true
```

3. **使用自定义域名**（减少 DNS 查询）

4. **监控 Worker 性能**
```bash
wrangler tail
```

---

### 7. Worker 超出限制

#### 症状：`1015 Rate Limited`

**原因**：超过免费计划限制（10万请求/天）

**解决**：

1. **查看当前用量**

访问 Dashboard → **Workers & Pages** → **Analytics**

2. **升级到付费计划**

Workers Paid: $5/月 + $0.50/百万请求

3. **优化请求**
- 启用缓存减少上游请求
- 使用 CDN 缓存静态资源

---

### 8. 开发服务器问题

#### 症状：`npm run dev` 无响应

**解决**：

1. **检查端口占用**
```bash
lsof -i :8787
```

如果被占用，杀死进程：
```bash
kill -9 <PID>
```

2. **指定端口**

编辑 `package.json`：
```json
"dev": "wrangler dev --port 8788"
```

3. **清理缓存**
```bash
rm -rf node_modules/.cache
npm run dev
```

---

## 调试技巧

### 1. 查看实时日志

```bash
wrangler tail
```

这会显示所有请求的实时日志。

### 2. 本地调试

```bash
npm run dev
```

然后使用浏览器开发者工具或 curl 测试。

### 3. 添加调试日志

在 `src/index.js` 中：
```javascript
console.log('Request:', request.url);
console.log('Detection:', detection);
```

日志会显示在 `wrangler tail` 输出中。

### 4. 测试特定场景

```bash
# 测试爬虫检测
curl -A "nmap" http://localhost:8787/

# 测试白名单
curl -H "CF-Connecting-IP: 192.168.1.1" http://localhost:8787/

# 测试缓存
curl -I http://localhost:8787/formulae.brew.sh/api/formula.json
```

---

## 获取帮助

如果问题仍未解决：

1. 查看 [GitHub Issues](https://github.com/your-repo/issues)
2. 提交新 Issue，包含：
   - 错误信息
   - 复现步骤
   - `wrangler tail` 日志
   - 系统信息（OS、Homebrew 版本等）
