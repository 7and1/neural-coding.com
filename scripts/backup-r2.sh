#!/bin/bash
set -euo pipefail

# R2 Backup Script
# Syncs R2 bucket to local storage

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/db/backups/r2"

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

# Get bucket name from wrangler.toml
cd "${PROJECT_ROOT}/apps/api"

BUCKET_NAME=$(grep -A 2 '\[\[r2_buckets\]\]' wrangler.toml | grep 'bucket_name' | cut -d'"' -f2)
if [[ -z "$BUCKET_NAME" ]]; then
  log_error "Could not find bucket_name in wrangler.toml"
  exit 1
fi

# Create backup directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BACKUP_DIR}/${BUCKET_NAME}_${TIMESTAMP}"
mkdir -p "$BACKUP_PATH"

log_info "Backing up R2 bucket: $BUCKET_NAME"
log_info "Backup path: $BACKUP_PATH"

# List and download objects
log_info "Downloading objects from R2..."

# Note: This is a simplified version. For production, consider using rclone or aws-cli with R2
# wrangler r2 object get is available but doesn't support bulk operations yet

log_info "⚠️  R2 bulk backup requires additional tooling (rclone or aws-cli)"
log_info "Configure rclone with Cloudflare R2 credentials:"
echo ""
echo "  [r2]"
echo "  type = s3"
echo "  provider = Cloudflare"
echo "  access_key_id = YOUR_ACCESS_KEY"
echo "  secret_access_key = YOUR_SECRET_KEY"
echo "  endpoint = https://ACCOUNT_ID.r2.cloudflarestorage.com"
echo ""
echo "Then run: rclone sync r2:$BUCKET_NAME $BACKUP_PATH"
echo ""

log_info "Backup directory created: $BACKUP_PATH"
