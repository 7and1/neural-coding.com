#!/bin/bash
set -euo pipefail

# Monitoring Setup Script
# Configures monitoring and alerting for neural-coding.com

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Neural Coding Monitoring Setup                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

log_step "Monitoring setup options:"
echo ""
echo "1. Sentry (Error Tracking)"
echo "   - Sign up: https://sentry.io"
echo "   - Create project for neural-coding.com"
echo "   - Add SENTRY_DSN to .env"
echo ""

log_step "Cloudflare Analytics (Built-in)"
echo "   - Web Analytics: https://dash.cloudflare.com/analytics"
echo "   - Workers Analytics: https://dash.cloudflare.com/workers/analytics"
echo "   - Already enabled for your account"
echo ""

log_step "Health Check Monitoring"
echo "   - Use: https://uptimerobot.com (free tier)"
echo "   - Monitor: https://neural-coding.com"
echo "   - Monitor: https://api.neural-coding.com/api/health"
echo "   - Alert via email/Slack/Discord"
echo ""

log_step "Custom Monitoring Endpoints"
echo "   - API Health: https://api.neural-coding.com/api/health"
echo "   - API V1 Health: https://api.neural-coding.com/api/v1/health"
echo ""

log_info "Monitoring setup guide complete"
log_info "See docs/MONITORING.md for detailed instructions"
