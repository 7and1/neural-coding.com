# Neural-Coding.com Routing & Deployment

## Overview

This document defines the URL structure, deployment configurations, CI/CD pipelines, and environment management for neural-coding.com.

---

## URL Structure

### Route Map

| Path | Handler | Description |
|------|---------|-------------|
| `/` | Cloudflare Pages | Landing page |
| `/playground` | Cloudflare Pages | Tools listing |
| `/playground/*` | Cloudflare Pages | Tool detail pages |
| `/api` | Cloudflare Pages | API documentation |
| `/api/health` | Worker | Health check (legacy) |
| `/api/v1/health` | Worker | Health check |
| `/api/v1/playground/tools` | Worker | Tools metadata |
| `/api/v1/brain-context` | Worker | Term explanation |
| `/api/v1/learn/posts` | Worker | Article list |
| `/api/v1/learn/posts/:slug` | Worker | Article detail |
| `/api/internal/*` | Worker | Admin endpoints |
| `/learn` | Worker (SSR) | Article index |
| `/learn/:slug` | Worker (SSR) | Article detail |
| `/assets/*` | Worker (R2) | Static assets |
| `/sitemap.xml` | Worker | Sitemap |
| `/rss.xml` | Worker | RSS feed |
| `tools.neural-coding.com/*` | VPS (Caddy) | Streamlit tools |

### Cloudflare Worker Routes

```
# Dashboard > Workers & Pages > neural-coding-api > Settings > Triggers > Routes

neural-coding.com/api/v1/*
neural-coding.com/api/internal/*
neural-coding.com/api/health
neural-coding.com/learn*
neural-coding.com/assets/*
neural-coding.com/sitemap.xml
neural-coding.com/rss.xml
```

---

## Cloudflare Pages Configuration

### Build Settings

```yaml
# Cloudflare Pages Dashboard Settings

Project name: neural-coding-web
Production branch: main
Build command: pnpm -C apps/web build
Build output directory: apps/web/dist
Root directory: /

# Environment variables
NODE_VERSION: 20
PNPM_VERSION: 10.27.0
```

### `_headers` File

```
# File: apps/web/public/_headers

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable
```

### `_redirects` File

```
# File: apps/web/public/_redirects

# Redirect www to non-www
https://www.neural-coding.com/* https://neural-coding.com/:splat 301

# Legacy redirects (if needed)
/blog/* /learn/:splat 301
/tools/* /playground/:splat 301
```

---

## Worker Configuration

### wrangler.toml

```toml
# File: apps/api/wrangler.toml

name = "neural-coding-api"
main = "src/index.ts"
compatibility_date = "2026-02-01"

# Account and zone (set via environment or wrangler login)
# account_id = "your-account-id"

[vars]
OPENAI_MODEL = "gpt-4o-mini"
OPENAI_IMAGE_MODEL = "gpt-image-1"
ARXIV_QUERY = "cat:q-bio.NC OR cat:cs.NE"

[[d1_databases]]
binding = "DB"
database_name = "neural_coding_prod"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "neural-coding-assets"

[triggers]
crons = ["0 */6 * * *"]

# Production environment
[env.production]
name = "neural-coding-api"
routes = [
  { pattern = "neural-coding.com/api/*", zone_name = "neural-coding.com" },
  { pattern = "neural-coding.com/learn*", zone_name = "neural-coding.com" },
  { pattern = "neural-coding.com/assets/*", zone_name = "neural-coding.com" },
  { pattern = "neural-coding.com/sitemap.xml", zone_name = "neural-coding.com" },
  { pattern = "neural-coding.com/rss.xml", zone_name = "neural-coding.com" }
]

# Staging environment
[env.staging]
name = "neural-coding-api-staging"
routes = [
  { pattern = "staging.neural-coding.com/api/*", zone_name = "neural-coding.com" },
  { pattern = "staging.neural-coding.com/learn*", zone_name = "neural-coding.com" }
]

[[env.staging.d1_databases]]
binding = "DB"
database_name = "neural_coding_staging"
database_id = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
```

---

## Docker Compose (VPS)

### Production Configuration

```yaml
# File: infra/docker-compose.yml

services:
  caddy:
    image: caddy:2.8-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - lif
      - weights
      - transpiler
      - nwb
    networks:
      - tools

  lif:
    build:
      context: ../services/streamlit/lif-explorer
      dockerfile: Dockerfile
    restart: unless-stopped
    command:
      - streamlit
      - run
      - app.py
      - --server.address=0.0.0.0
      - --server.port=8501
      - --server.baseUrlPath=/lif
      - --server.headless=true
      - --browser.gatherUsageStats=false
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8501/lif/_stcore/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - tools

  weights:
    build:
      context: ../services/streamlit/synaptic-weight-visualizer
      dockerfile: Dockerfile
    restart: unless-stopped
    command:
      - streamlit
      - run
      - app.py
      - --server.address=0.0.0.0
      - --server.port=8502
      - --server.baseUrlPath=/weights
      - --server.headless=true
      - --browser.gatherUsageStats=false
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8502/weights/_stcore/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - tools

  transpiler:
    build:
      context: ../services/streamlit/neural-code-transpiler
      dockerfile: Dockerfile
    restart: unless-stopped
    command:
      - streamlit
      - run
      - app.py
      - --server.address=0.0.0.0
      - --server.port=8503
      - --server.baseUrlPath=/transpiler
      - --server.headless=true
      - --browser.gatherUsageStats=false
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8503/transpiler/_stcore/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - tools

  nwb:
    build:
      context: ../services/streamlit/neuro-data-formatter
      dockerfile: Dockerfile
    restart: unless-stopped
    command:
      - streamlit
      - run
      - app.py
      - --server.address=0.0.0.0
      - --server.port=8504
      - --server.baseUrlPath=/nwb
      - --server.headless=true
      - --browser.gatherUsageStats=false
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8504/nwb/_stcore/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - tools

  watchtower:
    image: containrrr/watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400 --cleanup
    networks:
      - tools

volumes:
  caddy_data:
  caddy_config:

networks:
  tools:
    driver: bridge
```

### Streamlit Dockerfile Template

```dockerfile
# File: services/streamlit/lif-explorer/Dockerfile

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app.py .

# Create non-root user
RUN useradd -m -u 1000 streamlit
USER streamlit

# Expose port
EXPOSE 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8501/_stcore/health || exit 1

# Default command (overridden by docker-compose)
CMD ["streamlit", "run", "app.py", "--server.address=0.0.0.0", "--server.port=8501"]
```

### requirements.txt

```
# File: services/streamlit/lif-explorer/requirements.txt

streamlit==1.38.0
numpy==1.26.4
matplotlib==3.9.2
```

---

## Caddyfile

```
# File: infra/Caddyfile

{
    email admin@neural-coding.com
    acme_ca https://acme-v02.api.letsencrypt.org/directory
}

tools.neural-coding.com {
    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        -Server
    }

    # LIF Explorer
    handle /lif/* {
        reverse_proxy lif:8501
    }

    # Synaptic Weight Visualizer
    handle /weights/* {
        reverse_proxy weights:8502
    }

    # Neural Code Transpiler
    handle /transpiler/* {
        reverse_proxy transpiler:8503
    }

    # Neuro Data Formatter
    handle /nwb/* {
        reverse_proxy nwb:8504
    }

    # Root redirect to main site
    handle {
        redir https://neural-coding.com/playground permanent
    }

    # Logging
    log {
        output file /var/log/caddy/access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
```

---

## GitHub Actions CI/CD

### Main Workflow

```yaml
# File: .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '10.27.0'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm -r type-check

      - name: Test
        run: pnpm test

  deploy-worker:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build worker
        run: pnpm -C apps/api build

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/api
          command: deploy --env production

  deploy-pages:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build site
        run: pnpm -C apps/web build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy apps/web/dist --project-name=neural-coding-web

  deploy-vps:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/neural-coding
            git pull origin main
            cd infra
            docker compose pull
            docker compose up -d --build
            docker system prune -f
```

### PR Preview Workflow

```yaml
# File: .github/workflows/preview.yml

name: Preview

on:
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '10.27.0'

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build site
        run: pnpm -C apps/web build

      - name: Deploy preview
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy apps/web/dist --project-name=neural-coding-web --branch=${{ github.head_ref }}

      - name: Comment preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Preview deployed to: https://${context.payload.pull_request.head.ref}.neural-coding-web.pages.dev`
            })
```

### Database Migration Workflow

```yaml
# File: .github/workflows/migrate.yml

name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to migrate'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: '10.27.0'

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run migrations
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/api
          command: d1 execute neural_coding_${{ inputs.environment }} --remote --file=../../db/schema.sql
```

---

## Environment Management

### Environment Variables

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `OPENAI_API_KEY` | Local .dev.vars | Wrangler secret | Wrangler secret |
| `ADMIN_TOKEN` | Local .dev.vars | Wrangler secret | Wrangler secret |
| `OPENAI_MODEL` | gpt-4o-mini | gpt-4o-mini | gpt-4o-mini |
| `ARXIV_QUERY` | cat:q-bio.NC | cat:q-bio.NC | cat:q-bio.NC |
| `D1_DATABASE` | local | neural_coding_staging | neural_coding_prod |
| `R2_BUCKET` | local | neural-coding-staging | neural-coding-assets |

### Local Development Setup

```bash
# File: apps/api/.dev.vars (not committed)

OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
ADMIN_TOKEN=nc_admin_dev_xxxxxxxxxxxx
```

```bash
# Start local development
cd apps/api
pnpm dev  # Runs wrangler dev

# In another terminal
cd apps/web
pnpm dev  # Runs astro dev
```

### Secrets Management

```bash
# Set production secrets
cd apps/api
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put ADMIN_TOKEN --env production

# Set staging secrets
wrangler secret put OPENAI_API_KEY --env staging
wrangler secret put ADMIN_TOKEN --env staging

# List secrets
wrangler secret list --env production
```

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers/Pages/D1/R2 permissions |
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH username for VPS |
| `VPS_SSH_KEY` | Private SSH key for VPS access |

---

## Deployment Checklist

### Initial Setup

- [ ] Register domain neural-coding.com
- [ ] Add domain to Cloudflare
- [ ] Create Cloudflare API token
- [ ] Create D1 database (production)
- [ ] Create D1 database (staging)
- [ ] Create R2 bucket
- [ ] Set up GitHub repository secrets
- [ ] Provision VPS
- [ ] Configure VPS SSH access
- [ ] Install Docker on VPS
- [ ] Clone repository to VPS

### Pre-Deployment

- [ ] All tests passing
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Secrets set in Wrangler

### Deployment

- [ ] Deploy Worker to staging
- [ ] Test staging endpoints
- [ ] Deploy Pages to staging
- [ ] Test staging site
- [ ] Deploy Worker to production
- [ ] Deploy Pages to production
- [ ] Deploy VPS containers
- [ ] Verify all health checks

### Post-Deployment

- [ ] Verify production endpoints
- [ ] Check Cloudflare Analytics
- [ ] Monitor error rates
- [ ] Test cron job execution
- [ ] Verify SSL certificates

---

## Rollback Procedures

### Worker Rollback

```bash
# List deployments
wrangler deployments list --env production

# Rollback to previous version
wrangler rollback --env production
```

### Pages Rollback

```bash
# Via Cloudflare Dashboard:
# Pages > neural-coding-web > Deployments > Select previous > Rollback
```

### VPS Rollback

```bash
# SSH to VPS
ssh user@vps-host

# Rollback to previous commit
cd /opt/neural-coding
git log --oneline -5  # Find previous commit
git checkout <commit-hash>

# Rebuild containers
cd infra
docker compose up -d --build
```

### Database Rollback

```bash
# Restore from backup
wrangler r2 object get neural-coding-assets/backups/d1-backup-YYYYMMDD.sql.gz \
  --file=/tmp/backup.sql.gz

gunzip /tmp/backup.sql.gz

# Import to D1 (caution: destructive)
wrangler d1 execute neural_coding_prod --remote --file=/tmp/backup.sql
```
