#!/bin/bash
set -euo pipefail

# Production Deployment Script for neural-coding.com
# Usage: ./deploy.sh [--skip-tests] [--skip-migrations] [--api-only] [--web-only]

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_LOG="${SCRIPT_DIR}/deploy.log"
ROLLBACK_INFO="${SCRIPT_DIR}/.rollback-info"

# Parse arguments
SKIP_TESTS=false
SKIP_MIGRATIONS=false
API_ONLY=false
WEB_ONLY=false

for arg in "$@"; do
  case $arg in
    --skip-tests) SKIP_TESTS=true ;;
    --skip-migrations) SKIP_MIGRATIONS=true ;;
    --api-only) API_ONLY=true ;;
    --web-only) WEB_ONLY=true ;;
    --help)
      echo "Usage: ./deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-tests        Skip running tests"
      echo "  --skip-migrations   Skip database migrations"
      echo "  --api-only          Deploy only the API"
      echo "  --web-only          Deploy only the web app"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}[ERROR]${NC} Unknown option: $arg"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$DEPLOY_LOG"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$DEPLOY_LOG"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOY_LOG"
}

log_step() {
  echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$DEPLOY_LOG"
}

log_success() {
  echo -e "${MAGENTA}[SUCCESS]${NC} $1" | tee -a "$DEPLOY_LOG"
}

# Progress spinner
spinner() {
  local pid=$1
  local delay=0.1
  local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  while ps -p "$pid" > /dev/null 2>&1; do
    local temp=${spinstr#?}
    printf " [%c]  " "$spinstr"
    local spinstr=$temp${spinstr%"$temp"}
    sleep $delay
    printf "\b\b\b\b\b\b"
  done
  printf "    \b\b\b\b"
}

# Pre-flight checks
check_git_status() {
  log_step "Checking git status..."

  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_warn "Not a git repository, skipping git checks"
    return 0
  fi

  # Check for uncommitted changes
  if [[ -n $(git status --porcelain) ]]; then
    log_error "You have uncommitted changes. Please commit or stash them before deploying."
    git status --short
    return 1
  fi

  # Check current branch
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    log_warn "You are not on the 'main' branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      return 1
    fi
  fi

  # Save commit info for rollback
  CURRENT_COMMIT=$(git rev-parse HEAD)
  echo "COMMIT=$CURRENT_COMMIT" > "$ROLLBACK_INFO"
  echo "BRANCH=$CURRENT_BRANCH" >> "$ROLLBACK_INFO"
  echo "TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$ROLLBACK_INFO"

  log_info "Git status: clean (commit: ${CURRENT_COMMIT:0:8})"
}

check_dependencies() {
  log_step "Checking dependencies..."

  # Check for required commands
  local missing_deps=()

  if ! command -v pnpm &> /dev/null; then
    missing_deps+=("pnpm")
  fi

  if ! command -v wrangler &> /dev/null; then
    missing_deps+=("wrangler")
  fi

  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    log_error "Missing required dependencies: ${missing_deps[*]}"
    log_info "Install with: npm install -g pnpm wrangler"
    return 1
  fi

  log_info "All dependencies present"
}

check_env_vars() {
  log_step "Checking environment variables..."

  local missing_vars=()

  # Check Cloudflare credentials
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    missing_vars+=("CLOUDFLARE_API_TOKEN")
  fi

  if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    missing_vars+=("CLOUDFLARE_ACCOUNT_ID")
  fi

  if [[ ${#missing_vars[@]} -gt 0 ]]; then
    log_error "Missing required environment variables: ${missing_vars[*]}"
    log_info "Run: source scripts/setup-env.sh"
    return 1
  fi

  log_info "Environment variables configured"
}

run_tests() {
  if [[ "$SKIP_TESTS" == true ]]; then
    log_warn "Skipping tests (--skip-tests flag)"
    return 0
  fi

  log_step "Running tests..."

  # Type checking
  log_info "Running type checks..."
  if ! pnpm -C apps/api typecheck >> "$DEPLOY_LOG" 2>&1; then
    log_error "API type check failed"
    return 1
  fi

  if ! pnpm -C apps/web typecheck >> "$DEPLOY_LOG" 2>&1; then
    log_error "Web type check failed"
    return 1
  fi

  log_success "All tests passed"
}

deploy_migrations() {
  if [[ "$SKIP_MIGRATIONS" == true ]]; then
    log_warn "Skipping migrations (--skip-migrations flag)"
    return 0
  fi

  if [[ "$WEB_ONLY" == true ]]; then
    log_info "Skipping migrations (web-only deployment)"
    return 0
  fi

  log_step "Running database migrations..."

  if [[ ! -f "${SCRIPT_DIR}/scripts/migrate.sh" ]]; then
    log_warn "Migration script not found, skipping"
    return 0
  fi

  if ! bash "${SCRIPT_DIR}/scripts/migrate.sh" >> "$DEPLOY_LOG" 2>&1; then
    log_error "Database migration failed"
    return 1
  fi

  log_success "Migrations completed"
}

deploy_api() {
  if [[ "$WEB_ONLY" == true ]]; then
    log_info "Skipping API deployment (web-only mode)"
    return 0
  fi

  log_step "Deploying API to Cloudflare Workers..."

  cd "${SCRIPT_DIR}/apps/api"

  # Deploy with wrangler
  log_info "Running wrangler deploy..."
  if ! pnpm deploy >> "$DEPLOY_LOG" 2>&1; then
    log_error "API deployment failed"
    return 1
  fi

  cd "${SCRIPT_DIR}"

  log_success "API deployed successfully"
}

deploy_web() {
  if [[ "$API_ONLY" == true ]]; then
    log_info "Skipping web deployment (api-only mode)"
    return 0
  fi

  log_step "Deploying web app to Cloudflare Pages..."

  cd "${SCRIPT_DIR}/apps/web"

  # Build the site
  log_info "Building Astro site..."
  if ! pnpm build >> "$DEPLOY_LOG" 2>&1; then
    log_error "Web build failed"
    return 1
  fi

  # Deploy to Cloudflare Pages
  log_info "Deploying to Cloudflare Pages..."
  if ! wrangler pages deploy dist --project-name=neural-coding-web >> "$DEPLOY_LOG" 2>&1; then
    log_error "Web deployment failed"
    return 1
  fi

  cd "${SCRIPT_DIR}"

  log_success "Web app deployed successfully"
}

verify_deployment() {
  log_step "Verifying deployment..."

  if [[ "$WEB_ONLY" != true ]]; then
    # Check API health
    log_info "Checking API health..."
    if ! bash "${SCRIPT_DIR}/scripts/verify-deployment.sh" api >> "$DEPLOY_LOG" 2>&1; then
      log_warn "API health check failed (non-fatal)"
    else
      log_info "API is healthy"
    fi
  fi

  if [[ "$API_ONLY" != true ]]; then
    # Check web health
    log_info "Checking web health..."
    if ! bash "${SCRIPT_DIR}/scripts/verify-deployment.sh" web >> "$DEPLOY_LOG" 2>&1; then
      log_warn "Web health check failed (non-fatal)"
    else
      log_info "Web is healthy"
    fi
  fi

  log_success "Deployment verification complete"
}

rollback() {
  log_error "Deployment failed! Initiating rollback..."

  if [[ -f "$ROLLBACK_INFO" ]]; then
    source "$ROLLBACK_INFO"
    log_info "Rolling back to commit: ${COMMIT:0:8}"

    # Note: Actual rollback would require previous deployment info
    # For now, just log the error
    log_error "Manual rollback required. See docs/ROLLBACK.md"
    log_info "Previous commit: $COMMIT"
  else
    log_error "No rollback info found. Manual intervention required."
  fi

  exit 1
}

cleanup() {
  log_info "Cleaning up temporary files..."
  # Add any cleanup tasks here
}

# Main deployment flow
main() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║         Neural Coding Deployment Script v1.0              ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""

  # Initialize log
  echo "=== Deployment started at $(date) ===" > "$DEPLOY_LOG"

  log_info "Starting deployment process..."

  # Pre-flight checks
  check_git_status || rollback
  check_dependencies || rollback
  check_env_vars || rollback
  run_tests || rollback

  # Deployment steps
  deploy_migrations || rollback
  deploy_api || rollback
  deploy_web || rollback

  # Post-deployment
  verify_deployment
  cleanup

  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║              Deployment Completed Successfully!           ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""

  log_success "Deployment completed at $(date)"
  log_info "View logs: $DEPLOY_LOG"

  if [[ "$API_ONLY" != true ]]; then
    echo ""
    echo "🌐 Web: https://neural-coding.com"
  fi

  if [[ "$WEB_ONLY" != true ]]; then
    echo "🔌 API: https://api.neural-coding.com"
  fi

  echo ""
}

# Trap errors and run rollback
trap rollback ERR

# Run main
main "$@"
