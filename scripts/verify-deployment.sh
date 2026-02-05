#!/bin/bash
set -euo pipefail

# Deployment Verification Script
# Checks health of deployed services

TARGET=${1:-all}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Configuration
API_URL="${API_URL:-https://api.neural-coding.com}"
WEB_URL="${WEB_URL:-https://neural-coding.com}"
TIMEOUT=10

verify_api() {
  log_info "Verifying API deployment..."

  # Check health endpoint
  local health_url="${API_URL}/api/health"
  local response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$health_url" 2>/dev/null || echo "000")
  local body=$(echo "$response" | head -n -1)
  local status=$(echo "$response" | tail -n 1)

  if [[ "$status" == "200" ]]; then
    log_info "✓ API health check passed"
    log_info "  Response: $body"
    return 0
  else
    log_error "✗ API health check failed (HTTP $status)"
    return 1
  fi
}

verify_web() {
  log_info "Verifying web deployment..."

  # Check homepage
  local response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$WEB_URL" 2>/dev/null || echo "000")
  local status=$(echo "$response" | tail -n 1)

  if [[ "$status" == "200" ]]; then
    log_info "✓ Web homepage accessible"
  else
    log_error "✗ Web homepage failed (HTTP $status)"
    return 1
  fi

  # Check sitemap
  local sitemap_url="${WEB_URL}/sitemap-index.xml"
  local sitemap_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$sitemap_url" 2>/dev/null || echo "000")

  if [[ "$sitemap_status" == "200" ]]; then
    log_info "✓ Sitemap accessible"
  else
    log_warn "⚠ Sitemap not found (HTTP $sitemap_status)"
  fi

  return 0
}

# Main
case "$TARGET" in
  api)
    verify_api
    ;;
  web)
    verify_web
    ;;
  all)
    verify_api
    echo ""
    verify_web
    ;;
  *)
    log_error "Unknown target: $TARGET"
    echo "Usage: $0 [api|web|all]"
    exit 1
    ;;
esac

log_info "Verification complete"
