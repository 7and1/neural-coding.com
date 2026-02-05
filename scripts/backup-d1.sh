#!/bin/bash
set -euo pipefail

# D1 Database Backup Script
# Exports D1 database to SQL file

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

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check for wrangler
if ! command -v wrangler &> /dev/null; then
  log_error "wrangler not found. Install with: npm install -g wrangler"
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Get database name from wrangler.toml
cd "${PROJECT_ROOT}/apps/api"

DATABASE_NAME=$(grep -A 2 '\[\[d1_databases\]\]' wrangler.toml | grep 'database_name' | cut -d'"' -f2)
if [[ -z "$DATABASE_NAME" ]]; then
  log_error "Could not find database_name in wrangler.toml"
  exit 1
fi

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DATABASE_NAME}_${TIMESTAMP}.sql"

log_info "Backing up database: $DATABASE_NAME"
log_info "Backup file: $BACKUP_FILE"

# Export database
log_info "Exporting database..."

# Get list of tables
TABLES=$(wrangler d1 execute "$DATABASE_NAME" --command="SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name" --remote --json 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "")

if [[ -z "$TABLES" ]]; then
  log_error "No tables found in database"
  exit 1
fi

# Start backup file
echo "-- D1 Database Backup: $DATABASE_NAME" > "$BACKUP_FILE"
echo "-- Created: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$BACKUP_FILE"
echo "" >> "$BACKUP_FILE"

# Export schema and data for each table
for table in $TABLES; do
  log_info "Exporting table: $table"

  # Get schema
  SCHEMA=$(wrangler d1 execute "$DATABASE_NAME" --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='$table'" --remote --json 2>/dev/null | grep -o '"sql":"[^"]*"' | cut -d'"' -f4 || echo "")

  if [[ -n "$SCHEMA" ]]; then
    echo "-- Table: $table" >> "$BACKUP_FILE"
    echo "$SCHEMA;" >> "$BACKUP_FILE"
    echo "" >> "$BACKUP_FILE"
  fi

  # Get data
  wrangler d1 execute "$DATABASE_NAME" --command="SELECT * FROM $table" --remote --json 2>/dev/null | \
    grep -o '".*"' | \
    sed 's/^/INSERT INTO '"$table"' VALUES (/' | \
    sed 's/$/);/' >> "$BACKUP_FILE" 2>/dev/null || true

  echo "" >> "$BACKUP_FILE"
done

# Compress backup
log_info "Compressing backup..."
gzip -f "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

log_info "✓ Backup complete: $BACKUP_FILE"

# Clean up old backups (keep last 10)
log_info "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t ${DATABASE_NAME}_*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

log_info "Backup complete"
