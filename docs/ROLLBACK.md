# Rollback Guide

Emergency procedures for rolling back failed deployments.

## Quick Rollback

If a deployment fails or causes issues, follow these steps immediately.

## Cloudflare Workers (API)

### Method 1: Rollback via Dashboard

1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages
3. Select `neural-coding-api`
4. Click "Deployments" tab
5. Find the last working deployment
6. Click "..." menu → "Rollback to this deployment"

### Method 2: Rollback via CLI

```bash
# List recent deployments
wrangler deployments list

# Rollback to specific deployment
wrangler rollback [DEPLOYMENT_ID]
```

### Method 3: Redeploy Previous Version

```bash
# Find last working commit
git log --oneline

# Checkout previous commit
git checkout <commit-hash>

# Deploy
cd apps/api
pnpm deploy

# Return to main
git checkout main
```

## Cloudflare Pages (Web)

### Method 1: Rollback via Dashboard

1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages
3. Select `neural-coding-web`
4. Click "Deployments" tab
5. Find the last working deployment
6. Click "..." menu → "Rollback to this deployment"

### Method 2: Redeploy Previous Version

```bash
# Checkout previous commit
git checkout <commit-hash>

# Build and deploy
cd apps/web
pnpm build
wrangler pages deploy dist --project-name=neural-coding-web

# Return to main
git checkout main
```

## Database Rollback

### Restore from Backup

If migrations caused issues:

```bash
# List available backups
ls -lt db/backups/*.sql.gz

# Restore from backup
./scripts/restore-d1.sh db/backups/neural_coding_prod_TIMESTAMP.sql.gz
```

### Manual Rollback

If you need to undo specific migrations:

```bash
cd apps/api

# Connect to database
wrangler d1 execute neural_coding_prod --remote

# Run rollback SQL manually
# Example: DROP TABLE IF EXISTS new_table;
```

## Rollback Checklist

When rolling back:

- [ ] Identify the issue (API error, web issue, database problem)
- [ ] Note the current deployment version/commit
- [ ] Identify the last known good version
- [ ] Perform rollback using appropriate method
- [ ] Verify rollback successful
- [ ] Check health endpoints
- [ ] Monitor error rates
- [ ] Document the incident
- [ ] Create post-mortem

## Common Rollback Scenarios

### Scenario 1: API Returns 500 Errors

**Symptoms**: API health check fails, 500 errors in logs

**Solution**:
1. Rollback API deployment via dashboard
2. Check Cloudflare Workers logs for root cause
3. Fix issue in code
4. Test locally with `wrangler dev`
5. Redeploy when fixed

### Scenario 2: Web Pages Not Loading

**Symptoms**: 404 errors, blank pages, build issues

**Solution**:
1. Rollback Pages deployment via dashboard
2. Check build logs for errors
3. Test build locally: `pnpm build`
4. Fix build issues
5. Redeploy when fixed

### Scenario 3: Database Migration Failed

**Symptoms**: API errors, missing tables, data corruption

**Solution**:
1. Restore database from backup
2. Review migration SQL
3. Test migration on local D1 database
4. Apply fixed migration

### Scenario 4: Secrets Not Set

**Symptoms**: API errors about missing env vars

**Solution**:
```bash
cd apps/api
echo "your-key" | wrangler secret put OPENAI_API_KEY
echo "your-token" | wrangler secret put ADMIN_TOKEN
```

## Prevention

To minimize rollback needs:

1. **Test Locally First**
   ```bash
   # API
   cd apps/api
   wrangler dev

   # Web
   cd apps/web
   pnpm dev
   ```

2. **Use Staging Environment**
   - Deploy to staging first
   - Test thoroughly
   - Then deploy to production

3. **Automated Tests**
   - Run tests before deployment
   - Use GitHub Actions for CI/CD
   - Block deployment if tests fail

4. **Gradual Rollout**
   - Deploy during low-traffic periods
   - Monitor metrics closely
   - Have team available for quick response

5. **Regular Backups**
   ```bash
   # Backup database before major changes
   ./scripts/backup-d1.sh

   # Backup R2 assets
   ./scripts/backup-r2.sh
   ```

## Emergency Contacts

If rollback doesn't resolve the issue:

1. **Cloudflare Support**
   - Dashboard: https://dash.cloudflare.com/support
   - Community: https://community.cloudflare.com

2. **Team Escalation**
   - Check team communication channels
   - Escalate to senior engineers
   - Document all actions taken

## Post-Rollback

After successful rollback:

1. **Verify System Health**
   ```bash
   ./scripts/verify-deployment.sh
   ```

2. **Monitor Metrics**
   - Check error rates
   - Monitor response times
   - Verify user reports

3. **Root Cause Analysis**
   - Review logs
   - Identify what went wrong
   - Document findings

4. **Fix and Redeploy**
   - Fix the issue
   - Test thoroughly
   - Deploy with caution
   - Monitor closely

## Rollback Logs

Keep a log of all rollbacks:

```
Date: 2026-02-04
Time: 14:30 UTC
Component: API
Reason: 500 errors after deployment
Action: Rolled back to commit abc123
Result: System restored, errors resolved
Root Cause: Missing environment variable
Prevention: Added env var validation to deploy script
```

## Additional Resources

- [Cloudflare Workers Rollback](https://developers.cloudflare.com/workers/platform/deployments/rollbacks/)
- [Cloudflare Pages Rollback](https://developers.cloudflare.com/pages/platform/rollbacks/)
- [D1 Database Backup](https://developers.cloudflare.com/d1/platform/backups/)
