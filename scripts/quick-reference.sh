#!/bin/bash
# Quick reference for common deployment tasks

cat << 'EOF'
╔════════════════════════════════════════════════════════════╗
║         Neural Coding Deployment Quick Reference          ║
╚════════════════════════════════════════════════════════════╝

SETUP
─────────────────────────────────────────────────────────────
  ./scripts/setup-env.sh          Interactive environment setup
  ./scripts/validate-env.sh       Validate configuration
  ./scripts/setup-monitoring.sh   Monitoring setup guide

DEPLOYMENT
─────────────────────────────────────────────────────────────
  ./deploy.sh                     Full deployment (recommended)
  ./deploy.sh --api-only          Deploy API only
  ./deploy.sh --web-only          Deploy web only
  ./deploy.sh --skip-tests        Skip type checking
  ./deploy.sh --skip-migrations   Skip database migrations

DATABASE
─────────────────────────────────────────────────────────────
  ./scripts/migrate.sh            Run pending migrations
  ./scripts/backup-d1.sh          Backup database
  ./scripts/restore-d1.sh FILE    Restore from backup

VERIFICATION
─────────────────────────────────────────────────────────────
  ./scripts/verify-deployment.sh      Verify all services
  ./scripts/verify-deployment.sh api  Verify API only
  ./scripts/verify-deployment.sh web  Verify web only

MANUAL DEPLOYMENT
─────────────────────────────────────────────────────────────
  API:
    cd apps/api
    pnpm typecheck
    pnpm deploy

  Web:
    cd apps/web
    pnpm typecheck
    pnpm build
    wrangler pages deploy dist --project-name=neural-coding-web

MONITORING
─────────────────────────────────────────────────────────────
  Health Checks:
    curl https://api.neural-coding.com/api/health
    curl https://neural-coding.com

  Logs:
    wrangler tail neural-coding-api
    wrangler tail neural-coding-api --status error

  Deployments:
    wrangler deployments list

ROLLBACK
─────────────────────────────────────────────────────────────
  Dashboard:
    1. Go to dash.cloudflare.com
    2. Workers & Pages → Select project
    3. Deployments → Rollback

  CLI:
    wrangler deployments list
    wrangler rollback [DEPLOYMENT_ID]

DOCUMENTATION
─────────────────────────────────────────────────────────────
  docs/DEPLOYMENT.md       Complete deployment guide
  docs/ROLLBACK.md         Emergency procedures
  docs/MONITORING.md       Observability setup
  docs/INFRASTRUCTURE.md   Infrastructure overview

GITHUB ACTIONS
─────────────────────────────────────────────────────────────
  .github/workflows/deploy_api.yml   Auto-deploy API
  .github/workflows/deploy-web.yml   Auto-deploy web
  .github/workflows/test.yml         CI tests

TROUBLESHOOTING
─────────────────────────────────────────────────────────────
  Check logs:           cat deploy.log
  Verify environment:   ./scripts/validate-env.sh
  Test locally:         wrangler dev (API) or pnpm dev (web)
  Check status:         wrangler deployments list

SUPPORT
─────────────────────────────────────────────────────────────
  Cloudflare Docs:  https://developers.cloudflare.com
  Wrangler CLI:     https://developers.cloudflare.com/workers/wrangler

EOF
