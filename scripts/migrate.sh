#!/bin/bash
set -euo pipefail

# Database Migration Script for D1
# Applies pending migrations to Cloudflare D1 database

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="${PROJECT_ROOT}/apps/api/migrations"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if migrations directory exists
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  log_error "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

# Check for wrangler
if ! command -v wrangler &> /dev/null; then
  log_error "wrangler not found. Install with: npm install -g wrangler"
  exit 1
fi

# Check environment variables
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  log_error "CLOUDFLARE_API_TOKEN not set"
  exit 1
fi

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  log_error "CLOUDFLARE_ACCOUNT_ID not set"
  exit 1
fi

# Get database name from wrangler.toml
cd "${PROJECT_ROOT}/apps/api"

DATABASE_NAME=$(grep -A 2 '\[\[d1_databases\]\]' wrangler.toml | grep 'database_name' | cut -d'"' -f2)
if [[ -z "$DATABASE_NAME" ]]; then
  log_error "Could not find database_name in wrangler.toml"
  exit 1
fi

log_info "Database: $DATABASE_NAME"

# Create migrations tracking table if it doesn't exist
log_step "Ensuring migrations tracking table exists..."

cat > /tmp/create_migrations_table.sql <<EOF
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
EOF

wrangler d1 execute "$DATABASE_NAME" --file=/tmp/create_migrations_table.sql --remote > /dev/null 2>&1 || {
  log_warn "Could not create migrations table (may already exist)"
}

rm -f /tmp/create_migrations_table.sql

# Get list of applied migrations
log_step "Checking applied migrations..."

APPLIED_MIGRATIONS=$(wrangler d1 execute "$DATABASE_NAME" --command="SELECT filename FROM _migrations ORDER BY id" --remote --json 2>/dev/null | grep -o '"filename":"[^"]*"' | cut -d'"' -f4 || echo "")

# Find pending migrations
PENDING_MIGRATIONS=()

for migration_file in "$MIGRATIONS_DIR"/*.sql; do
  if [[ ! -f "$migration_file" ]]; then
    continue
  fi

  filename=$(basename "$migration_file")

  # Skip if already applied
  if echo "$APPLIED_MIGRATIONS" | grep -q "$filename"; then
    log_info "✓ Already applied: $filename"
    continue
  fi

  PENDING_MIGRATIONS+=("$migration_file")
done

# Apply pending migrations
if [[ ${#PENDING_MIGRATIONS[@]} -eq 0 ]]; then
  log_info "No pending migrations"
  exit 0
fi

log_step "Applying ${#PENDING_MIGRATIONS[@]} pending migration(s)..."

for migration_file in "${PENDING_MIGRATIONS[@]}"; do
  filename=$(basename "$migration_file")

  log_info "Applying: $filename"

  # Apply migration
  if ! wrangler d1 execute "$DATABASE_NAME" --file="$migration_file" --remote; then
    log_error "Failed to apply migration: $filename"
    exit 1
  fi

  # Record migration
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  wrangler d1 execute "$DATABASE_NAME" --command="INSERT INTO _migrations (filename, applied_at) VALUES ('$filename', '$TIMESTAMP')" --remote > /dev/null

  log_info "✓ Applied: $filename"
done

log_info "All migrations applied successfully"
