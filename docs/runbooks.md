# Runbooks（部署与运维）

## Cloudflare Worker（apps/api）

1. 创建 D1：`neural_coding_prod`
2. 创建 R2：`neural-coding-assets`
3. Wrangler 绑定：编辑 `apps/api/wrangler.toml` 的 D1/R2 id
4. 设置 secrets：

```bash
cd apps/api
wrangler secret put OPENAI_API_KEY
wrangler secret put ADMIN_TOKEN
```

5. （可选）设置 vars（抓取源与图片模型）：

- `ARXIV_QUERY`（默认 `cat:q-bio.NC OR cat:cs.NE`）
- `OPENREVIEW_INVITATIONS`（逗号分隔 invitation；不配则跳过 OpenReview）
- `OPENAI_IMAGE_MODEL`（默认 `gpt-image-1`；可按需要换成其它 OpenAI 图片模型）

6. 初始化 D1 schema：

```bash
wrangler d1 execute neural_coding_prod --remote --file ../../db/schema.sql
```

7. 部署：

```bash
wrangler deploy
```

### 路由（同域分流）

在 Cloudflare Dashboard 为 Worker 添加 routes（示例）：

- `neural-coding.com/api/v1/*`
- `neural-coding.com/api/internal/*`
- `neural-coding.com/learn*`
- `neural-coding.com/assets/*`

这样 `neural-coding.com/` 与 `neural-coding.com/api/`（文档页）仍由 Pages 提供，而 API 与 Learn SSR 由 Worker 提供。

### 本地初始化 D1（可选）

```bash
cd apps/api
wrangler d1 execute neural_coding_prod --local --file ../../db/schema.sql --config ./wrangler.toml
```

## Cloudflare Pages（apps/web）

- Build command: `pnpm -C apps/web build`
- Output directory: `apps/web/dist`
- 环境变量：按需配置 `PUBLIC_API_BASE`（例如 `https://neural-coding.com` 或 `https://api.neural-coding.com`）

## VPS（Streamlit + Nginx）

```bash
cd infra
docker compose up -d --build
```

- 将 `tools.neural-coding.com` 解析到 VPS
- Cloudflare SSL: Full (strict)
- Nginx：限制 `/`，仅暴露工具路径；必要时加 Basic Auth
