#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Neural Coding Infrastructure Setup"
echo "========================================="
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}Warning: .env file already exists${NC}"
    read -p "Do you want to regenerate passwords? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing .env file"
    else
        echo "Backing up existing .env to .env.backup"
        cp .env .env.backup

        echo "Generating new .env with secure passwords..."
        cp .env.example .env

        # Generate and replace passwords
        ROOT_PASS=$(generate_password)
        NPM_PASS=$(generate_password)

        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/change_me_root_password_min_32_chars/${ROOT_PASS}/" .env
            sed -i '' "s/change_me_npm_password_min_32_chars/${NPM_PASS}/" .env
        else
            # Linux
            sed -i "s/change_me_root_password_min_32_chars/${ROOT_PASS}/" .env
            sed -i "s/change_me_npm_password_min_32_chars/${NPM_PASS}/" .env
        fi

        echo -e "${GREEN}✓ Generated .env with secure passwords${NC}"
    fi
else
    echo "Creating .env file with secure passwords..."
    cp .env.example .env

    # Generate and replace passwords
    ROOT_PASS=$(generate_password)
    NPM_PASS=$(generate_password)

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/change_me_root_password_min_32_chars/${ROOT_PASS}/" .env
        sed -i '' "s/change_me_npm_password_min_32_chars/${NPM_PASS}/" .env
    else
        # Linux
        sed -i "s/change_me_root_password_min_32_chars/${ROOT_PASS}/" .env
        sed -i "s/change_me_npm_password_min_32_chars/${NPM_PASS}/" .env
    fi

    echo -e "${GREEN}✓ Created .env with secure passwords${NC}"
fi

echo ""
echo "Creating Docker volumes..."
docker volume create npm_db 2>/dev/null || echo "Volume npm_db already exists"
docker volume create npm_data 2>/dev/null || echo "Volume npm_data already exists"
docker volume create npm_letsencrypt 2>/dev/null || echo "Volume npm_letsencrypt already exists"
docker volume create nginx_logs 2>/dev/null || echo "Volume nginx_logs already exists"
echo -e "${GREEN}✓ Docker volumes ready${NC}"

echo ""
echo "Building and starting services..."
docker compose up -d --build

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "Service Status:"
docker compose ps

echo ""
echo "========================================="
echo -e "${GREEN}Infrastructure Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Service URLs:"
echo "  - Nginx Proxy Manager Admin: http://localhost:81"
echo "    Default login: admin@example.com / changeme"
echo "    ${YELLOW}IMPORTANT: Change password immediately!${NC}"
echo ""
echo "  - Streamlit Tools Hub: http://localhost:8000"
echo "    - LIF Explorer: http://localhost:8000/lif/"
echo "    - Weight Visualizer: http://localhost:8000/weights/"
echo "    - Code Transpiler: http://localhost:8000/transpiler/"
echo "    - Data Formatter: http://localhost:8000/nwb/"
echo ""
echo "Next Steps:"
echo "  1. Change NPM admin password at http://localhost:81"
echo "  2. Configure proxy hosts in NPM for your domain"
echo "  3. Set up SSL certificates (Let's Encrypt)"
echo "  4. Update Cloudflare DNS to point to your server"
echo ""
echo "Useful Commands:"
echo "  - View logs: docker compose logs -f [service]"
echo "  - Restart: docker compose restart [service]"
echo "  - Stop all: docker compose down"
echo "  - Update: docker compose pull && docker compose up -d"
echo ""
echo -e "${YELLOW}Security Reminder:${NC}"
echo "  - Port 81 is restricted to localhost only"
echo "  - Use SSH tunnel for remote access: ssh -L 81:localhost:81 user@server"
echo "  - Keep .env file secure and never commit it to git"
echo ""
