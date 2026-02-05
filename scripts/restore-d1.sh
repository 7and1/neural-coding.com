#!/bin/bash
set -euo pipefail

# D1 Database Restore Script
# Restores D1 database from SQL backup file

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/db/backups"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Check arguments
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup_file>"
  echo ""
  echo "Available backups:"
  ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -10 || echo "  (no backups found)"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
  log_error "Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Check for wrangler
if ! command -v wrangler &> /dev/null; then
  log_error "wrangler not found. Install with: npm install -g wrangler"
  exit 1
fi

# Get database name from wrangler.toml
cd "${PROJECT_ROOT}/apps/api"

DATABASE_NAME=$(grep -A 2 '\[\[d1_databases\]\]' wrangler.toml | grep 'database_name' | cut -d'"' -f2)
if [[ -z "$DATABASE_NAME" ]]; then
  log_error "Could not find database_name in wrangler.toml"
  exit 1
fi

log_warn "⚠️  WARNING: This will restore the database: $DATABASE_NAME"
log_warn "⚠️  All current data will be replaced!"
echo ""
read -p "Continue? (type 'yes' to confirm): " confirm

if [[ "$confirm" != "yes" ]]; then
  log_info "Restore cancelled"
  exit 0
fi

# Decompress if needed
TEMP_SQL="/tmp/restore_$(date +%s).sql"
if [[ "$BACKUP_FILE" == *.gz ]]; then
  log_info "Decompressing backup..."
  gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"
else
  cp "$BACKUP_FILE" "$TEMP_SQL"
fi

log_info "Restoring database: $DATABASE_NAME"

# Apply SQL file
if ! wrangler d1 execute "$DATABASE_NAME" --file="$TEMP_SQL" --remote; then
  log_error "Failed to restore database"
  rm -f "$TEMP_SQL"
  exit 1
fi

# Clean up
rm -f "$TEMP_SQL"

log_info "✓ Database restored successfully"
