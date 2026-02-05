# Monitoring Guide

Comprehensive monitoring and observability setup for neural-coding.com.

## Overview

This guide covers monitoring, alerting, and observability for:
- Cloudflare Workers (API)
- Cloudflare Pages (Web)
- D1 Database
- R2 Storage

## Built-in Cloudflare Analytics

### Workers Analytics

Access at: https://dash.cloudflare.com/workers/analytics

**Metrics Available:**
- Request count
- Error rate
- CPU time
- Duration (p50, p75, p99)
- Status codes

**How to Use:**
1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select `neural-coding-api`
4. Click "Metrics" tab

### Pages Analytics

Access at: https://dash.cloudflare.com/pages/analytics

**Metrics Available:**
- Page views
- Unique visitors
- Bandwidth usage
- Build time
- Deployment history

**How to Use:**
1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select `neural-coding-web`
4. Click "Analytics" tab

## Health Check Endpoints

### API Health

```bash
curl https://api.neural-coding.com/api/health
```

Response:
```json
{
  "ok": true,
  "ts": "2026-02-04T10:30:00Z"
}
```

### Web Health

```bash
curl -I https://neural-coding.com
```

Should return `200 OK`.

## External Monitoring Services

### 1. UptimeRobot (Recommended - Free)

**Setup:**

1. Sign up at https://uptimerobot.com
2. Create monitors:
   - **API Monitor**
     - Type: HTTP(s)
     - URL: `https://api.neural-coding.com/api/health`
     - Interval: 5 minutes
     - Alert: Email/Slack/Discord

   - **Web Monitor**
     - Type: HTTP(s)
     - URL: `https://neural-coding.com`
     - Interval: 5 minutes
     - Alert: Email/Slack/Discord

3. Configure alerts:
   - Email notifications
   - Slack webhook (optional)
   - Discord webhook (optional)

**Alert Thresholds:**
- Down for 2+ checks (10 minutes)
- Response time > 5 seconds

### 2. Better Uptime (Alternative)

**Setup:**

1. Sign up at https://betteruptime.com
2. Create monitors for API and Web
3. Configure on-call schedule
4. Set up status page

### 3. Pingdom (Enterprise)

For more advanced monitoring:
- Multi-location checks
- Transaction monitoring
- Real user monitoring (RUM)

## Error Tracking with Sentry

### Setup Sentry

1. **Create Account**
   - Sign up at https://sentry.io
   - Create organization

2. **Create Projects**
   - Create project: `neural-coding-api`
   - Create project: `neural-coding-web`

3. **Get DSN**
   - Copy DSN from project settings
   - Add to `.env`:
     ```
     SENTRY_DSN=https://xxx@sentry.io/xxx
     SENTRY_ENVIRONMENT=production
     ```

### Integrate with API

Add to `apps/api/src/index.ts`:

```typescript
import * as Sentry from '@sentry/cloudflare';

// Initialize Sentry
Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.SENTRY_ENVIRONMENT || 'production',
  tracesSampleRate: 0.1,
});

// Wrap handlers
app.onError((err, c) => {
  Sentry.captureException(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});
```

### Integrate with Web

Add to `apps/web/src/pages/_error.astro`:

```typescript
import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  environment: 'production',
});
```

## Logging

### Cloudflare Logs

**Real-time Logs:**

```bash
# API logs
wrangler tail neural-coding-api

# Filter errors only
wrangler tail neural-coding-api --status error
```

**Logpush (Enterprise):**
- Push logs to S3, R2, or analytics platforms
- Requires Cloudflare Enterprise plan

### Custom Logging

Add structured logging to API:

```typescript
// apps/api/src/lib/logger.ts
export function log(level: string, message: string, meta?: any) {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  }));
}

// Usage
log('info', 'Request processed', { path: '/api/health', duration: 45 });
log('error', 'Database query failed', { error: err.message });
```

## Alerting

### Slack Notifications

**Setup Webhook:**

1. Create Slack app: https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Add webhook URL to `.env`:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

**Send Alerts:**

```typescript
async function sendSlackAlert(message: string) {
  await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  });
}

// Usage
await sendSlackAlert('🚨 API deployment failed!');
```

### Discord Notifications

Similar to Slack:

1. Create webhook in Discord server settings
2. Add to `.env`:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
   ```

### Email Alerts

Use Cloudflare Email Workers or SendGrid:

```typescript
async function sendEmailAlert(to: string, subject: string, body: string) {
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'alerts@neural-coding.com' },
      subject,
      content: [{ type: 'text/plain', value: body }]
    })
  });
}
```

## Metrics to Monitor

### API Metrics

**Critical:**
- Error rate (target: < 1%)
- Response time p99 (target: < 500ms)
- Availability (target: 99.9%)

**Important:**
- Request rate
- CPU time
- Database query time

**Nice to Have:**
- Cache hit rate
- OpenAI API latency
- R2 read/write latency

### Web Metrics

**Critical:**
- Page load time (target: < 2s)
- Availability (target: 99.9%)

**Important:**
- Build time
- Deployment success rate
- Core Web Vitals (LCP, FID, CLS)

**Nice to Have:**
- Unique visitors
- Page views
- Bounce rate

### Database Metrics

**Monitor:**
- Query count
- Query duration
- Storage size
- Row count

**Check:**
```bash
# Get database info
wrangler d1 info neural_coding_prod

# Query stats
wrangler d1 execute neural_coding_prod --command="SELECT COUNT(*) FROM papers"
```

## Dashboards

### Custom Dashboard

Create a simple status dashboard:

```html
<!-- apps/web/src/pages/status.astro -->
---
const apiHealth = await fetch('https://api.neural-coding.com/api/health')
  .then(r => r.json())
  .catch(() => ({ ok: false }));
---

<html>
  <head>
    <title>Status - Neural Coding</title>
  </head>
  <body>
    <h1>System Status</h1>
    <div>
      <h2>API</h2>
      <p>Status: {apiHealth.ok ? '✅ Operational' : '❌ Down'}</p>
    </div>
    <div>
      <h2>Web</h2>
      <p>Status: ✅ Operational</p>
    </div>
  </body>
</html>
```

### Grafana (Advanced)

For advanced dashboards:
1. Set up Grafana Cloud
2. Configure Cloudflare Logpush
3. Create custom dashboards
4. Set up alerts

## Incident Response

### When Alert Fires

1. **Acknowledge**
   - Acknowledge alert in monitoring tool
   - Notify team

2. **Investigate**
   - Check Cloudflare dashboard
   - Review logs: `wrangler tail`
   - Check health endpoints

3. **Mitigate**
   - If critical: rollback (see ROLLBACK.md)
   - If minor: monitor and fix

4. **Resolve**
   - Deploy fix
   - Verify resolution
   - Update status page

5. **Post-Mortem**
   - Document incident
   - Identify root cause
   - Implement prevention

## Monitoring Checklist

- [ ] UptimeRobot monitors configured
- [ ] Slack/Discord webhooks set up
- [ ] Sentry error tracking enabled
- [ ] Health check endpoints working
- [ ] Alert thresholds configured
- [ ] On-call schedule defined
- [ ] Runbooks documented
- [ ] Status page created

## Useful Commands

```bash
# Check API health
curl https://api.neural-coding.com/api/health

# Check web health
curl -I https://neural-coding.com

# Tail API logs
wrangler tail neural-coding-api

# View deployment history
wrangler deployments list

# Check database size
wrangler d1 info neural_coding_prod

# Run verification script
./scripts/verify-deployment.sh
```

## Resources

- [Cloudflare Analytics](https://developers.cloudflare.com/analytics/)
- [Workers Observability](https://developers.cloudflare.com/workers/observability/)
- [Sentry Cloudflare](https://docs.sentry.io/platforms/javascript/guides/cloudflare/)
- [UptimeRobot Docs](https://uptimerobot.com/api/)
