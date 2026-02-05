# neural-coding.com

Neural-coding.com 落地工程（Cloudflare Pages + Workers + D1/R2 + Streamlit/Docker + Nginx）。

## Monorepo 结构

- `apps/web`：Cloudflare Pages 前端（Astro 静态站点）
- `apps/api`：Cloudflare Worker（API + /learn SSR + 自动化管道）
- `db/schema.sql`：D1 数据库 schema
- `infra/docker-compose.yml`：Streamlit 工具栈（含 Nginx 反代）
- `services/streamlit/*`：各工具 Streamlit 应用
- `docs/*`：架构/路线图/运维说明

## 快速开始（本地）

### 1) 安装依赖

```bash
pnpm install
```

### 2) Worker（API + /learn）

```bash
cd apps/api
cp .dev.vars.example .dev.vars
wrangler dev
```

### 3) Pages 前端（Astro）

```bash
cd apps/web
pnpm dev
```

### 4) Streamlit 工具栈（Docker）

```bash
cd infra
docker compose up --build
```

## 部署（Cloudflare）

看 `docs/architecture.md`、`docs/automation.md` 与 `docs/runbooks.md`。
