# @neural-coding/api (Cloudflare Workers)

## Bindings

`apps/api/wrangler.jsonc` expects:

- D1 binding: `DB`
- R2 binding: `BUCKET`
- Vars: `ENVIRONMENT`, `STREAMLIT_ORIGIN`
- Secret: `INGEST_TOKEN`

## Setup (once)

Create D1 + R2 (example commands):

```bash
cd apps/api
npx wrangler d1 create neural_coding
npx wrangler r2 bucket create neural-coding
```

Update `apps/api/wrangler.jsonc` with the returned `database_id`.

Apply migrations:

```bash
npx wrangler d1 migrations apply neural_coding --remote
```

Set ingestion token:

```bash
npx wrangler secret put INGEST_TOKEN
```

## Local dev

```bash
cd ../../
npm install
npm run dev:api
```
