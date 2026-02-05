# Deployment Guide

Complete guide for deploying neural-coding.com to production.

## Prerequisites

1. **Cloudflare Account**
   - Sign up at https://cloudflare.com
   - Create API token with Workers and Pages permissions
   - Note your Account ID

2. **Required Tools**
   - Node.js 22+
   - pnpm 10+
   - wrangler CLI

3. **Environment Setup**
   - OpenAI API key (for content generation)
   - Admin token (for internal endpoints)

## Initial Setup

### 1. Configure Environment

Run the interactive setup script:

```bash
./scripts/setup-env.sh
```

Or manually create `.env`:

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `OPENAI_API_KEY` - OpenAI API key
- `ADMIN_TOKEN` - Secure admin token

### 2. Create Cloudflare Resources

#### D1 Database

```bash
cd apps/api
wrangler d1 create neural_coding_prod
```

Update `wrangler.toml` with the database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "neural_coding_prod"
database_id = "YOUR_DATABASE_ID_HERE"
```

#### R2 Bucket

```bash
wrangler r2 bucket create neural-coding-assets
```

#### Cloudflare Pages Project

```bash
wrangler pages project create neural-coding-web
```

### 3. Run Database Migrations

```bash
./scripts/migrate.sh
```

This will:
- Create migrations tracking table
- Apply all pending migrations
- Record applied migrations

## Deployment Methods

### Method 1: Automated Deployment Script (Recommended)

Deploy everything with pre-flight checks:

```bash
./deploy.sh
```

Options:
- `--skip-tests` - Skip type checking
- `--skip-migrations` - Skip database migrations
- `--api-only` - Deploy only the API
- `--web-only` - Deploy only the web app

Examples:

```bash
# Full deployment
./deploy.sh

# Deploy only API
./deploy.sh --api-only

# Deploy without running tests (faster)
./deploy.sh --skip-tests
```

### Method 2: Manual Deployment

#### Deploy API

```bash
cd apps/api
pnpm typecheck
pnpm deploy
```

#### Deploy Web

```bash
cd apps/web
pnpm typecheck
pnpm build
wrangler pages deploy dist --project-name=neural-coding-web
```

### Method 3: GitHub Actions (CI/CD)

Push to `main` branch triggers automatic deployment:

- **API**: `.github/workflows/deploy-api.yml`
  - Triggers on changes to `apps/api/**`
  - Runs migrations
  - Deploys to Workers
  - Verifies health

- **Web**: `.github/workflows/deploy-web.yml`
  - Triggers on changes to `apps/web/**`
  - Builds Astro site
  - Deploys to Pages
  - Verifies deployment

Required GitHub Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Post-Deployment

### 1. Verify Deployment

```bash
./scripts/verify-deployment.sh
```

Or manually:

```bash
# Check API
curl https://api.neural-coding.com/api/health

# Check Web
curl https://neural-coding.com
```

### 2. Configure Custom Domain

In Cloudflare Dashboard:

1. **Workers (API)**
   - Go to Workers & Pages
   - Select `neural-coding-api`
   - Add custom domain: `api.neural-coding.com`

2. **Pages (Web)**
   - Go to Workers & Pages
   - Select `neural-coding-web`
   - Add custom domain: `neural-coding.com`

### 3. Set Production Secrets

Set secrets in Cloudflare:

```bash
# API secrets
cd apps/api
echo "your-openai-key" | wrangler secret put OPENAI_API_KEY
echo "your-admin-token" | wrangler secret put ADMIN_TOKEN
```

## Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Database created and migrated
- [ ] R2 bucket created
- [ ] Custom domains configured
- [ ] Secrets set in Cloudflare
- [ ] Tests passing
- [ ] Git status clean
- [ ] On `main` branch

## Troubleshooting

### Deployment Fails

1. Check logs: `cat deploy.log`
2. Verify environment variables: `./scripts/setup-env.sh`
3. Check Cloudflare dashboard for errors

### Migration Fails

1. Check database exists: `wrangler d1 list`
2. Verify database ID in `wrangler.toml`
3. Run migrations manually: `./scripts/migrate.sh`

### Health Check Fails

1. Wait 30 seconds for deployment to propagate
2. Check Cloudflare Workers logs
3. Verify custom domain DNS

## Rollback

See [ROLLBACK.md](./ROLLBACK.md) for emergency rollback procedures.

## Monitoring

See [MONITORING.md](./MONITORING.md) for monitoring setup.

## Support

- Cloudflare Docs: https://developers.cloudflare.com
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler
- Project Issues: https://github.com/your-org/neural-coding.com/issues
