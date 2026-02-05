# Quick Start

Get neural-coding.com running locally in 5 minutes.

## Prerequisites

- Node.js 22+
- pnpm 10+
- Cloudflare account (for deployment)
- Docker (optional, for Streamlit tools)

## Setup (5 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/neural-coding.com.git
cd neural-coding.com
pnpm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
# Required: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
# Optional: OPENAI_API_KEY (for content generation)
```

For the API specifically:

```bash
cd apps/api
cp .dev.vars.example .dev.vars
# Edit .dev.vars with:
# ADMIN_TOKEN=your-secure-token
# OPENAI_API_KEY=sk-...
```

### 3. Create Local Database

```bash
cd apps/api
wrangler d1 create neural_coding_dev
# Copy the database_id to wrangler.toml [env.dev] section

# Apply schema
wrangler d1 execute neural_coding_dev --local --file=../../db/schema.sql
```

### 4. Start Development Servers

Open three terminal windows:

**Terminal 1: API (Cloudflare Worker)**
```bash
cd apps/api
pnpm dev
# Runs at http://localhost:8787
```

**Terminal 2: Web (Astro)**
```bash
cd apps/web
pnpm dev
# Runs at http://localhost:4321
```

**Terminal 3: Tools (Optional - Streamlit)**
```bash
cd infra
./setup.sh
# Runs at http://localhost:8000
```

### 5. Open in Browser

- **Web**: http://localhost:4321
- **API**: http://localhost:8787
- **API Health**: http://localhost:8787/api/health
- **Tools**: http://localhost:8000 (if running)

## Project Structure

```
neural-coding.com/
├── apps/
│   ├── api/          # Cloudflare Worker (Hono)
│   ├── web/          # Astro frontend
│   ├── pages/        # Cloudflare Pages config
│   └── streamlit/    # Streamlit tools
├── db/
│   ├── schema.sql    # Database schema
│   └── migrations/   # Migration files
├── docs/             # Documentation
├── infra/            # Docker/infrastructure
├── scripts/          # Utility scripts
└── tests/            # E2E tests
```

## Common Tasks

### Run Tests

```bash
# All tests
pnpm test

# API tests only
cd apps/api && pnpm test

# E2E tests (requires servers running)
pnpm test:e2e
```

### Type Check

```bash
# All packages
pnpm -r typecheck

# API only
cd apps/api && pnpm typecheck
```

### Lint

```bash
pnpm lint
```

### Build for Production

```bash
pnpm build
```

### Run Database Migrations

```bash
./scripts/migrate.sh
```

### Trigger Content Pipeline

```bash
# Ingest papers from arXiv
curl -X POST http://localhost:8787/api/admin/ingest \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Deploy to Production

### Quick Deploy

```bash
./deploy.sh
```

### Manual Deploy

```bash
# Deploy API
cd apps/api
pnpm deploy

# Deploy Web
cd apps/web
pnpm build
wrangler pages deploy dist --project-name=neural-coding-web
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## Environment Variables

### Root `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | Yes | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Cloudflare account ID |

### API `.dev.vars`

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_TOKEN` | Yes | Token for admin endpoints |
| `OPENAI_API_KEY` | No | OpenAI API key for content generation |

## Troubleshooting

### "Database not found"

Create the local database:
```bash
cd apps/api
wrangler d1 create neural_coding_dev --local
wrangler d1 execute neural_coding_dev --local --file=../../db/schema.sql
```

### "Port already in use"

Kill existing processes:
```bash
lsof -ti:8787 | xargs kill -9  # API
lsof -ti:4321 | xargs kill -9  # Web
```

### "Module not found"

Reinstall dependencies:
```bash
rm -rf node_modules
pnpm install
```

### API returns 500 errors

Check the Worker logs:
```bash
cd apps/api
wrangler tail --local
```

## Next Steps

1. Read the [Architecture Overview](docs/architecture.md)
2. Review the [API Reference](docs/API_REFERENCE.md)
3. Check the [Development Roadmap](docs/DEVELOPMENT_ROADMAP.md)
4. See the [Testing Strategy](docs/TESTING_STRATEGY.md)

## Getting Help

- Check existing [documentation](docs/)
- Review [GitHub Issues](https://github.com/your-org/neural-coding.com/issues)
- Read Cloudflare Workers [documentation](https://developers.cloudflare.com/workers/)
