#!/bin/bash
set -euo pipefail

# Environment Validation Script
# Validates all required environment variables are set

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

# Track validation status
ERRORS=0
WARNINGS=0

# Check required variables
check_required() {
  local var_name=$1
  local var_value="${!var_name:-}"

  if [[ -z "$var_value" ]]; then
    log_error "Missing required variable: $var_name"
    ((ERRORS++))
    return 1
  else
    log_info "✓ $var_name is set"
    return 0
  fi
}

# Check optional variables
check_optional() {
  local var_name=$1
  local var_value="${!var_name:-}"

  if [[ -z "$var_value" ]]; then
    log_warn "Optional variable not set: $var_name"
    ((WARNINGS++))
    return 1
  else
    log_info "✓ $var_name is set"
    return 0
  fi
}

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Environment Variables Validation                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Load .env if exists
if [[ -f .env ]]; then
  log_info "Loading .env file..."
  set -a
  source .env
  set +a
else
  log_warn "No .env file found"
fi

echo ""
log_info "Checking required variables..."
echo ""

# Required for deployment
check_required "CLOUDFLARE_API_TOKEN"
check_required "CLOUDFLARE_ACCOUNT_ID"

# Required for API functionality
check_required "OPENAI_API_KEY"
check_required "ADMIN_TOKEN"

echo ""
log_info "Checking optional variables..."
echo ""

# Optional but recommended
check_optional "OPENAI_MODEL"
check_optional "D1_DATABASE_ID"
check_optional "R2_BUCKET_NAME"
check_optional "SENTRY_DSN"

echo ""
echo "════════════════════════════════════════════════════════════"

if [[ $ERRORS -gt 0 ]]; then
  echo -e "${RED}✗ Validation failed with $ERRORS error(s)${NC}"
  echo ""
  echo "Run: ./scripts/setup-env.sh to configure environment"
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo -e "${YELLOW}⚠ Validation passed with $WARNINGS warning(s)${NC}"
  echo ""
  echo "Optional variables are not set but deployment can proceed"
  exit 0
else
  echo -e "${GREEN}✓ All validations passed${NC}"
  exit 0
fi
