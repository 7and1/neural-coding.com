# Neural Coding Deployment Infrastructure

Production-grade deployment automation for neural-coding.com.

## Overview

This directory contains all deployment scripts, workflows, and documentation for deploying and managing neural-coding.com in production.

## Quick Start

```bash
# 1. Setup environment
./scripts/setup-env.sh

# 2. Validate configuration
./scripts/validate-env.sh

# 3. Run migrations
./scripts/migrate.sh

# 4. Deploy everything
./deploy.sh
```

## Project Structure

```
neural-coding.com/
├── deploy.sh                    # Main deployment script
├── .env.example                 # Environment template
├── scripts/
│   ├── setup-env.sh            # Interactive environment setup
│   ├── validate-env.sh         # Environment validation
│   ├── migrate.sh              # Database migrations
│   ├── backup-d1.sh            # D1 database backup
│   ├── restore-d1.sh           # D1 database restore
│   ├── backup-r2.sh            # R2 storage backup
│   ├── verify-deployment.sh    # Post-deployment verification
│   └── setup-monitoring.sh     # Monitoring setup guide
├── .github/workflows/
│   ├── deploy-api.yml          # API deployment workflow
│   ├── deploy-web.yml          # Web deployment workflow
│   ├── test.yml                # CI test workflow
│   └── content_daily.yml       # Daily content ingestion
└── docs/
    ├── DEPLOYMENT.md           # Deployment guide
    ├── ROLLBACK.md             # Rollback procedures
    └── MONITORING.md           # Monitoring setup
```

## Deployment Scripts

### Main Deployment Script

**`deploy.sh`** - Production deployment with safety checks

Features:
- Pre-flight checks (git status, dependencies, env vars)
- Type checking
- Database migrations
- API deployment (Cloudflare Workers)
- Web deployment (Cloudflare Pages)
- Post-deployment verification
- Rollback on failure
- Colored output with progress indicators

Usage:
```bash
./deploy.sh                    # Full deployment
./deploy.sh --api-only         # Deploy only API
./deploy.sh --web-only         # Deploy only web
./deploy.sh --skip-tests       # Skip type checking
./deploy.sh --skip-migrations  # Skip database migrations
```

### Environment Management

**`scripts/setup-env.sh`** - Interactive environment setup

Creates `.env` file with all required configuration:
- Cloudflare credentials
- OpenAI API key
- Admin token (auto-generated if not provided)
- Database configuration
- R2 storage configuration

**`scripts/validate-env.sh`** - Environment validation

Validates all required environment variables are set before deployment.

### Database Management

**`scripts/migrate.sh`** - Database migration runner

Features:
- Creates migrations tracking table
- Applies pending migrations to D1
- Records applied migrations
- Idempotent (safe to run multiple times)

**`scripts/backup-d1.sh`** - Database backup

Features:
- Exports D1 database to SQL
- Compresses backup with gzip
- Keeps last 10 backups
- Timestamped filenames

**`scripts/restore-d1.sh`** - Database restore

Features:
- Restores from SQL backup
- Confirmation prompt
- Handles compressed backups

### Storage Management

**`scripts/backup-r2.sh`** - R2 storage backup

Guide for backing up R2 bucket using rclone or aws-cli.

### Verification

**`scripts/verify-deployment.sh`** - Deployment verification

Checks:
- API health endpoint
- Web homepage accessibility
- Sitemap availability

Usage:
```bash
./scripts/verify-deployment.sh        # Check all
./scripts/verify-deployment.sh api    # Check API only
./scripts/verify-deployment.sh web    # Check web only
```

## GitHub Actions Workflows

### API Deployment

**`.github/workflows/deploy-api.yml`**

Triggers:
- Push to `main` branch
- Changes to `apps/api/**` or `packages/shared/**`
- Manual workflow dispatch

Steps:
1. Checkout code
2. Setup Node.js and pnpm
3. Install dependencies
4. Type check
5. Run migrations
6. Deploy to Cloudflare Workers
7. Verify deployment
8. Notify on success/failure

### Web Deployment

**`.github/workflows/deploy-web.yml`**

Triggers:
- Push to `main` branch
- Changes to `apps/web/**` or `packages/shared/**`
- Manual workflow dispatch

Steps:
1. Checkout code
2. Setup Node.js and pnpm
3. Install dependencies
4. Type check
5. Build Astro site
6. Deploy to Cloudflare Pages
7. Verify deployment
8. Notify on success/failure

### CI Tests

**`.github/workflows/test.yml`**

Triggers:
- Pull requests to `main`
- Push to `main`

Jobs:
- Type checking (API and Web)
- Build testing
- Linting

## Environment Variables

### Required

```bash
# Cloudflare
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Admin
ADMIN_TOKEN=your-secure-token-here
```

### Optional

```bash
# Models
OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=dall-e-3

# Database
D1_DATABASE_ID=your-database-id
D1_DATABASE_NAME=neural_coding_prod

# Storage
R2_BUCKET_NAME=neural-coding-assets

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

## Documentation

### [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

Complete deployment guide covering:
- Prerequisites
- Initial setup
- Deployment methods
- Post-deployment steps
- Troubleshooting

### [ROLLBACK.md](./docs/ROLLBACK.md)

Emergency rollback procedures:
- Quick rollback methods
- Rollback by component (API, Web, Database)
- Common scenarios
- Prevention strategies

### [MONITORING.md](./docs/MONITORING.md)

Monitoring and observability setup:
- Cloudflare Analytics
- External monitoring (UptimeRobot, Better Uptime)
- Error tracking (Sentry)
- Logging and alerting
- Metrics to monitor

## Deployment Workflow

### Local Deployment

```bash
# 1. Ensure environment is configured
./scripts/validate-env.sh

# 2. Run pre-deployment checks
git status                    # Ensure clean working directory
pnpm -C apps/api typecheck   # Type check API
pnpm -C apps/web typecheck   # Type check web

# 3. Deploy
./deploy.sh

# 4. Verify
./scripts/verify-deployment.sh
```

### CI/CD Deployment

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feature/my-feature

# 4. CI runs tests automatically
# - Type checking
# - Build testing
# - Linting

# 5. Merge to main
# - Auto-deploys to production
# - Runs migrations
# - Verifies deployment
```

## Safety Features

### Pre-flight Checks

- Git status (no uncommitted changes)
- Branch verification (on `main`)
- Dependencies installed
- Environment variables set
- Type checking passes

### Rollback Capability

- Saves commit info before deployment
- Automatic rollback on error
- Manual rollback via Cloudflare dashboard
- Database restore from backups

### Verification

- Health check endpoints
- HTTP status verification
- Post-deployment smoke tests

## Monitoring

### Health Endpoints

- API: `https://api.neural-coding.com/api/health`
- Web: `https://neural-coding.com`

### Recommended Monitoring

1. **UptimeRobot** (Free)
   - Monitor health endpoints
   - 5-minute intervals
   - Email/Slack alerts

2. **Cloudflare Analytics** (Built-in)
   - Request metrics
   - Error rates
   - Performance data

3. **Sentry** (Optional)
   - Error tracking
   - Performance monitoring
   - Release tracking

## Troubleshooting

### Deployment Fails

1. Check logs: `cat deploy.log`
2. Verify environment: `./scripts/validate-env.sh`
3. Check Cloudflare dashboard
4. Review error messages

### Migration Fails

1. Verify database exists: `wrangler d1 list`
2. Check database ID in `wrangler.toml`
3. Run manually: `./scripts/migrate.sh`

### Health Check Fails

1. Wait 30 seconds for propagation
2. Check Cloudflare Workers logs: `wrangler tail`
3. Verify custom domain DNS

## Best Practices

1. **Always test locally first**
   ```bash
   cd apps/api && wrangler dev
   cd apps/web && pnpm dev
   ```

2. **Use feature branches**
   - Never commit directly to `main`
   - Create PRs for review
   - Let CI run tests

3. **Backup before major changes**
   ```bash
   ./scripts/backup-d1.sh
   ./scripts/backup-r2.sh
   ```

4. **Monitor after deployment**
   - Check health endpoints
   - Review error rates
   - Monitor response times

5. **Document incidents**
   - Keep rollback logs
   - Write post-mortems
   - Update runbooks

## Support

- **Cloudflare Docs**: https://developers.cloudflare.com
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler
- **Project Issues**: Create issue in repository

## License

See main project LICENSE file.
