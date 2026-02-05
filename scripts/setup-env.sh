#!/bin/bash
set -euo pipefail

# Interactive Environment Setup Script
# Creates .env file with required configuration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE="${PROJECT_ROOT}/.env.example"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Neural Coding Environment Setup                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env already exists
if [[ -f "$ENV_FILE" ]]; then
  echo -e "${YELLOW}Warning:${NC} .env file already exists"
  read -p "Overwrite? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled"
    exit 0
  fi
  mv "$ENV_FILE" "${ENV_FILE}.backup.$(date +%s)"
  echo -e "${GREEN}Backed up existing .env${NC}"
fi

# Start with example file
if [[ -f "$ENV_EXAMPLE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo -e "${GREEN}Created .env from template${NC}"
else
  touch "$ENV_FILE"
  echo -e "${YELLOW}No .env.example found, creating blank .env${NC}"
fi

echo ""
echo "Please provide the following configuration values:"
echo "(Press Enter to skip optional fields)"
echo ""

# Function to prompt for value
prompt_value() {
  local var_name=$1
  local prompt_text=$2
  local is_secret=${3:-false}
  local current_value=""

  # Get current value from .env if exists
  if grep -q "^${var_name}=" "$ENV_FILE" 2>/dev/null; then
    current_value=$(grep "^${var_name}=" "$ENV_FILE" | cut -d'=' -f2-)
  fi

  if [[ "$is_secret" == true ]]; then
    read -sp "${prompt_text}: " value
    echo
  else
    if [[ -n "$current_value" ]]; then
      read -p "${prompt_text} [${current_value}]: " value
      value=${value:-$current_value}
    else
      read -p "${prompt_text}: " value
    fi
  fi

  if [[ -n "$value" ]]; then
    # Update or add the value
    if grep -q "^${var_name}=" "$ENV_FILE" 2>/dev/null; then
      sed -i.bak "s|^${var_name}=.*|${var_name}=${value}|" "$ENV_FILE"
      rm -f "${ENV_FILE}.bak"
    else
      echo "${var_name}=${value}" >> "$ENV_FILE"
    fi
  fi
}

# Cloudflare Configuration
echo -e "${BLUE}=== Cloudflare Configuration ===${NC}"
prompt_value "CLOUDFLARE_API_TOKEN" "Cloudflare API Token" true
prompt_value "CLOUDFLARE_ACCOUNT_ID" "Cloudflare Account ID"
echo ""

# OpenAI Configuration
echo -e "${BLUE}=== OpenAI Configuration ===${NC}"
prompt_value "OPENAI_API_KEY" "OpenAI API Key" true
prompt_value "OPENAI_MODEL" "OpenAI Model (default: gpt-4o-mini)"
echo ""

# Admin Token
echo -e "${BLUE}=== Admin Authentication ===${NC}"
echo "Generate a secure admin token (or press Enter to auto-generate)"
read -sp "Admin Token: " admin_token
echo
if [[ -z "$admin_token" ]]; then
  admin_token=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
  echo -e "${GREEN}Generated admin token: ${admin_token}${NC}"
fi
if grep -q "^ADMIN_TOKEN=" "$ENV_FILE" 2>/dev/null; then
  sed -i.bak "s|^ADMIN_TOKEN=.*|ADMIN_TOKEN=${admin_token}|" "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
else
  echo "ADMIN_TOKEN=${admin_token}" >> "$ENV_FILE"
fi
echo ""

# Database Configuration
echo -e "${BLUE}=== Database Configuration ===${NC}"
prompt_value "D1_DATABASE_ID" "D1 Database ID"
prompt_value "D1_DATABASE_NAME" "D1 Database Name (default: neural_coding_prod)"
echo ""

# R2 Configuration
echo -e "${BLUE}=== R2 Storage Configuration ===${NC}"
prompt_value "R2_BUCKET_NAME" "R2 Bucket Name (default: neural-coding-assets)"
echo ""

# Deployment Configuration
echo -e "${BLUE}=== Deployment Configuration ===${NC}"
prompt_value "PROJECT_NAME_WEB" "Cloudflare Pages Project Name (default: neural-coding-web)"
prompt_value "PROJECT_NAME_API" "Cloudflare Workers Project Name (default: neural-coding-api)"
echo ""

# Set permissions
chmod 600 "$ENV_FILE"

echo ""
echo -e "${GREEN}✓ Environment setup complete!${NC}"
echo ""
echo "Configuration saved to: $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Review and update .env file if needed"
echo "  2. Load environment: source .env"
echo "  3. Run migrations: ./scripts/migrate.sh"
echo "  4. Deploy: ./deploy.sh"
echo ""
echo -e "${YELLOW}Important:${NC} Never commit .env to version control!"
echo ""
