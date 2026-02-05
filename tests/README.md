# Testing Infrastructure

This directory contains comprehensive testing for neural-coding.com.

## Test Structure

```
apps/api/src/
├── lib/
│   ├── auth.test.ts          # Auth token validation tests
│   ├── time.test.ts          # Timestamp generation tests
│   ├── ids.test.ts           # ID generation tests
│   ├── html.test.ts          # HTML escaping tests
│   └── openai.test.ts        # OpenAI API wrapper tests (mocked)
├── db.test.ts                # Database CRUD tests
└── index.test.ts             # API endpoint integration tests

tests/
├── homepage.spec.ts          # Homepage E2E tests
├── learn.spec.ts             # Learn section E2E tests
└── api.spec.ts               # API endpoint E2E tests
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
cd apps/api && pnpm test

# Run with coverage
cd apps/api && pnpm test:coverage

# Watch mode
cd apps/api && pnpm test:watch
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run specific test file
pnpm exec playwright test tests/api.spec.ts
```

### All Tests

```bash
# Run all tests (unit + E2E)
pnpm test
```

## Coverage Goals

- **Unit tests**: 60% overall, 80% for lib/
- **Integration tests**: All API endpoints
- **E2E tests**: Critical user flows

Current coverage thresholds are enforced in `apps/api/vitest.config.ts`:
- Lines: 60%
- Functions: 60%
- Branches: 60%
- Statements: 60%

## CI/CD Integration

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main` branch

See `.github/workflows/test.yml` for CI configuration.

## Test Files

### Unit Tests

#### `lib/auth.test.ts`
Tests admin token validation:
- Missing ADMIN_TOKEN configuration
- Invalid authorization headers
- Token mismatch
- Valid token authentication

#### `lib/time.test.ts`
Tests timestamp generation:
- ISO 8601 format validation
- Consistent timestamp generation
- Date parsing

#### `lib/ids.test.ts`
Tests ID generation:
- Prefix handling
- Timestamp component
- Random hex component
- Uniqueness
- URL-safe characters

#### `lib/html.test.ts`
Tests HTML escaping and document generation:
- Special character escaping (&, <, >, ", ')
- XSS prevention
- Meta tag generation
- Open Graph tags
- SEO elements

#### `lib/openai.test.ts`
Tests OpenAI API wrapper (mocked):
- Chat completions
- Image generation
- Error handling
- API key validation
- Response parsing

#### `db.test.ts`
Tests database operations:
- Article fetching
- Term explanation CRUD
- Query parameter binding
- Null handling

#### `index.test.ts`
Tests API endpoints:
- Health checks
- Playground tools
- Brain context API
- Learn articles API
- Admin endpoints
- 404 handling

### E2E Tests

#### `tests/homepage.spec.ts`
Tests homepage functionality:
- Page loading
- Navigation links
- Responsive design
- Main content

#### `tests/learn.spec.ts`
Tests learn section:
- Article list display
- Article detail navigation
- 404 handling
- Navigation

#### `tests/api.spec.ts`
Tests API endpoints:
- Health checks
- Tools endpoint
- Learn posts API
- Brain context API
- Error responses
- CORS handling

## Mocking Strategy

### Unit Tests
- D1 Database: Mocked with vi.fn()
- OpenAI API: Mocked with global fetch
- R2 Bucket: Mocked when needed

### E2E Tests
- Use real API endpoints
- Run against local dev server
- No external API calls in CI

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use beforeEach/afterEach for setup/teardown
3. **Mocking**: Mock external dependencies (OpenAI, D1)
4. **Coverage**: Aim for 60%+ overall, 80%+ for lib/
5. **Naming**: Use descriptive test names
6. **Assertions**: Use specific matchers (toBe, toEqual, toContain)

## Troubleshooting

### Tests failing locally
```bash
# Clear cache and reinstall
rm -rf node_modules apps/*/node_modules
pnpm install

# Update Playwright browsers
pnpm exec playwright install
```

### Coverage not meeting threshold
```bash
# Check coverage report
cd apps/api && pnpm test:coverage
open coverage/index.html
```

### E2E tests timing out
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify BASE_URL environment variable
