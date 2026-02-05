# Production Checklist

Comprehensive pre-launch checklist for neural-coding.com. Complete all items before going live.

## Environment Configuration

- [ ] **Cloudflare Account Setup**
  - [ ] Account created and verified
  - [ ] API token generated with Workers/Pages/D1/R2 permissions
  - [ ] Account ID documented

- [ ] **Environment Variables**
  - [ ] `CLOUDFLARE_API_TOKEN` set in CI/CD
  - [ ] `CLOUDFLARE_ACCOUNT_ID` set in CI/CD
  - [ ] `OPENAI_API_KEY` set as Cloudflare secret
  - [ ] `ADMIN_TOKEN` set as Cloudflare secret (strong, random value)
  - [ ] `.env` file NOT committed to git

- [ ] **Wrangler Configuration**
  - [ ] D1 database ID updated in `wrangler.toml`
  - [ ] R2 bucket name verified
  - [ ] Routes configured for custom domain
  - [ ] Environment-specific configs validated

## Database

- [ ] **D1 Database Setup**
  - [ ] Production database created (`wrangler d1 create neural_coding_prod`)
  - [ ] Database ID added to `wrangler.toml`
  - [ ] All migrations applied (`./scripts/migrate.sh`)
  - [ ] Migration status verified

- [ ] **Initial Data**
  - [ ] Tools table populated with initial tools
  - [ ] Sample articles created (or pipeline run)
  - [ ] FTS indexes built

- [ ] **Backup Strategy**
  - [ ] D1 export script tested
  - [ ] Backup schedule documented
  - [ ] Restore procedure tested

## Content & Assets

- [ ] **R2 Bucket**
  - [ ] Production bucket created
  - [ ] CORS configured if needed
  - [ ] Public access configured (or via Worker)

- [ ] **Initial Content**
  - [ ] At least 3-5 articles published
  - [ ] Cover images generated and uploaded
  - [ ] Tools metadata populated

- [ ] **Static Assets**
  - [ ] Favicon uploaded
  - [ ] OG images created
  - [ ] robots.txt configured
  - [ ] sitemap.xml generated

## Security

- [ ] **Authentication**
  - [ ] Admin endpoints protected with token
  - [ ] Token is cryptographically strong (32+ chars)
  - [ ] No hardcoded secrets in code

- [ ] **Rate Limiting**
  - [ ] Rate limiting enabled on public endpoints
  - [ ] Limits tested under load
  - [ ] Rate limit headers returned

- [ ] **Security Headers**
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `X-XSS-Protection: 1; mode=block`
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] `Content-Security-Policy` configured
  - [ ] CORS headers properly restricted

- [ ] **Input Validation**
  - [ ] All user inputs validated
  - [ ] SQL injection prevented (parameterized queries)
  - [ ] XSS prevented (HTML escaped)

## SEO & Meta Tags

- [ ] **Meta Tags**
  - [ ] Title tags unique per page
  - [ ] Meta descriptions present
  - [ ] Canonical URLs set
  - [ ] OG tags configured (title, description, image, type)
  - [ ] Twitter card tags configured

- [ ] **Structured Data**
  - [ ] JSON-LD for articles
  - [ ] Organization schema
  - [ ] Breadcrumb schema

- [ ] **Technical SEO**
  - [ ] robots.txt allows crawling
  - [ ] sitemap.xml generated and submitted
  - [ ] No broken internal links
  - [ ] 404 page configured
  - [ ] Redirects for old URLs (if applicable)

## Performance

- [ ] **Lighthouse Scores**
  - [ ] Performance: 90+
  - [ ] Accessibility: 90+
  - [ ] Best Practices: 90+
  - [ ] SEO: 90+

- [ ] **Core Web Vitals**
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1

- [ ] **Optimization**
  - [ ] Images optimized (WebP format)
  - [ ] CSS/JS minified
  - [ ] Fonts preloaded
  - [ ] Critical CSS inlined
  - [ ] Lazy loading for images

- [ ] **Caching**
  - [ ] Cache headers configured
  - [ ] Static assets cached (1 year)
  - [ ] API responses cached appropriately
  - [ ] Cache invalidation tested

## Accessibility

- [ ] **WCAG 2.1 AA Compliance**
  - [ ] Color contrast ratios pass
  - [ ] Focus indicators visible
  - [ ] Skip navigation link present
  - [ ] Alt text for all images
  - [ ] Form labels associated
  - [ ] ARIA landmarks used

- [ ] **Testing**
  - [ ] WAVE tool shows no errors
  - [ ] Screen reader tested
  - [ ] Keyboard navigation works
  - [ ] Reduced motion respected

## Cross-Browser & Device Testing

- [ ] **Desktop Browsers**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)

- [ ] **Mobile Browsers**
  - [ ] iOS Safari
  - [ ] Android Chrome

- [ ] **Responsive Design**
  - [ ] Mobile (320px - 480px)
  - [ ] Tablet (768px - 1024px)
  - [ ] Desktop (1024px+)
  - [ ] Large screens (1440px+)

## SSL & DNS

- [ ] **SSL/TLS**
  - [ ] SSL certificate active (Cloudflare automatic)
  - [ ] HTTPS enforced (redirect HTTP)
  - [ ] HSTS enabled
  - [ ] SSL Labs grade A or higher

- [ ] **DNS Configuration**
  - [ ] A/AAAA records configured
  - [ ] CNAME for www redirect
  - [ ] API subdomain configured
  - [ ] DNS propagation verified
  - [ ] CAA records set (optional)

## Monitoring & Alerting

- [ ] **Error Tracking**
  - [ ] Error logging enabled
  - [ ] Cloudflare Analytics enabled
  - [ ] Error alerts configured

- [ ] **Uptime Monitoring**
  - [ ] Health check endpoint monitored
  - [ ] Alert thresholds configured
  - [ ] On-call rotation set (if applicable)

- [ ] **Performance Monitoring**
  - [ ] Response time tracking
  - [ ] Error rate tracking
  - [ ] Request volume tracking

- [ ] **Logging**
  - [ ] Structured logging enabled
  - [ ] Log retention configured
  - [ ] Sensitive data not logged

## Deployment & Operations

- [ ] **CI/CD Pipeline**
  - [ ] GitHub Actions configured
  - [ ] Tests run on PR
  - [ ] Auto-deploy on merge to main
  - [ ] Deployment notifications set

- [ ] **Rollback Procedure**
  - [ ] Rollback script tested
  - [ ] Previous versions accessible
  - [ ] Database rollback procedure documented
  - [ ] Rollback time < 5 minutes

- [ ] **Documentation**
  - [ ] README up to date
  - [ ] API documentation complete
  - [ ] Deployment guide complete
  - [ ] Runbooks for common issues

## Legal & Compliance

- [ ] **Privacy**
  - [ ] Privacy policy page
  - [ ] Cookie consent (if applicable)
  - [ ] Data retention policy

- [ ] **Terms**
  - [ ] Terms of service page
  - [ ] License information for content

## Final Verification

- [ ] **Smoke Tests**
  - [ ] Homepage loads
  - [ ] Learn index loads
  - [ ] Article pages load
  - [ ] Tools page loads
  - [ ] API health check passes
  - [ ] Assets load from R2

- [ ] **Integration Tests**
  - [ ] All integration tests pass
  - [ ] E2E tests pass
  - [ ] No console errors

- [ ] **Load Testing**
  - [ ] Tested with expected traffic
  - [ ] No errors under load
  - [ ] Response times acceptable

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Reviewer | | | |
| Product Owner | | | |

---

## Post-Launch Checklist

After going live:

- [ ] Verify all pages accessible
- [ ] Submit sitemap to Google Search Console
- [ ] Monitor error rates for 24 hours
- [ ] Check analytics data flowing
- [ ] Verify cron jobs running
- [ ] Test contact/feedback forms
- [ ] Social media links working
- [ ] Share launch announcement

## Emergency Contacts

| Role | Contact |
|------|---------|
| Primary On-Call | |
| Cloudflare Support | support.cloudflare.com |
| Domain Registrar | |

## Quick Commands

```bash
# Check deployment status
./scripts/verify-deployment.sh

# Rollback to previous version
./scripts/rollback.sh

# Run migrations
./scripts/migrate.sh

# View logs
wrangler tail neural-coding-api

# Check database
wrangler d1 execute neural_coding_prod --command "SELECT COUNT(*) FROM learn_articles"
```
