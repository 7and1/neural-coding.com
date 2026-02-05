# Neural-Coding.com API Reference

## Overview

This document provides complete API reference documentation for neural-coding.com, including all endpoints, request/response formats, authentication, and code examples.

**Base URL**: `https://neural-coding.com`

---

## Authentication

### Public Endpoints

Most endpoints are public and require no authentication:
- `GET /api/health`
- `GET /api/v1/health`
- `GET /api/v1/playground/tools`
- `POST /api/v1/brain-context`
- `GET /api/v1/learn/posts`
- `GET /api/v1/learn/posts/:slug`
- `GET /learn`
- `GET /learn/:slug`
- `GET /assets/*`

### Admin Endpoints

Internal endpoints require Bearer token authentication:

```http
Authorization: Bearer <ADMIN_TOKEN>
```

Admin endpoints:
- `POST /api/internal/ingest/tick`
- `POST /api/internal/demo/publish`
- `POST /api/internal/demo/cover`

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/v1/brain-context` | 10 requests | 1 minute |
| `/api/v1/learn/*` | 100 requests | 1 minute |
| `/api/internal/*` | 10 requests | 1 minute |

Rate limit headers:
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1706976000
```

---

## Endpoints

### Health Check

#### GET /api/health

Legacy health check endpoint.

**Response**

```json
{
  "ok": true,
  "ts": "2026-02-03T12:00:00.000Z"
}
```

#### GET /api/v1/health

Current health check endpoint.

**Response**

```json
{
  "ok": true,
  "ts": "2026-02-03T12:00:00.000Z"
}
```

---

### Playground Tools

#### GET /api/v1/playground/tools

Returns metadata for all available interactive tools.

**Response**

```json
{
  "tools": [
    {
      "id": "lif-explorer",
      "name": "LIF-Explorer",
      "description": "Interactive LIF neuron model (spike & reset).",
      "path": "https://tools.neural-coding.com/lif/",
      "status": "alpha"
    },
    {
      "id": "synaptic-weight-visualizer",
      "name": "Synaptic-Weight Visualizer",
      "description": "Hebbian learning weight update visualization.",
      "path": "https://tools.neural-coding.com/weights/",
      "status": "alpha"
    },
    {
      "id": "neural-code-transpiler",
      "name": "Neural-Code-Transpiler",
      "description": "Python pseudocode to Brian2/Norse transpiler.",
      "path": "https://tools.neural-coding.com/transpiler/",
      "status": "alpha"
    },
    {
      "id": "neuro-data-formatter",
      "name": "Neuro-Data-Formatter",
      "description": "CSV to NWB format converter with validation.",
      "path": "https://tools.neural-coding.com/nwb/",
      "status": "alpha"
    }
  ]
}
```

**Tool Status Values**

| Status | Description |
|--------|-------------|
| `alpha` | Early development, may have bugs |
| `beta` | Feature complete, testing phase |
| `stable` | Production ready |

---

### Brain Context API

#### POST /api/v1/brain-context

Get AI-generated explanation for a neuroscience term. Results are cached in D1.

**Request Body**

```json
{
  "term": "spike-timing-dependent plasticity",
  "lang": "en"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `term` | string | Yes | - | Term to explain (1-200 chars) |
| `lang` | string | No | `"zh"` | Language: `"zh"` or `"en"` |

**Response (Success)**

```json
{
  "term": "spike-timing-dependent plasticity",
  "answer_md": "## Spike-Timing-Dependent Plasticity (STDP)\n\n**Definition**: STDP is a biological learning rule where the timing between pre- and post-synaptic spikes determines whether synaptic strength increases or decreases.\n\n### Key Points\n\n- If pre fires before post (within ~20ms): **LTP** (strengthening)\n- If post fires before pre: **LTD** (weakening)\n\n### Code Implementation\n\n```python\ndef stdp_update(dt, A_plus=0.01, A_minus=0.012, tau=20):\n    if dt > 0:  # pre before post\n        return A_plus * np.exp(-dt / tau)\n    else:  # post before pre\n        return -A_minus * np.exp(dt / tau)\n```\n\n### Related Terms\n\n- Hebbian learning\n- Long-term potentiation (LTP)\n",
  "cached": false,
  "model": "gpt-4o-mini"
}
```

**Response (Cached)**

```json
{
  "term": "spike-timing-dependent plasticity",
  "answer_md": "...",
  "cached": true,
  "model": "gpt-4o-mini"
}
```

**Error Responses**

```json
// 400 Bad Request - Invalid input
{
  "error": "Invalid request",
  "issues": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "String must contain at least 1 character(s)",
      "path": ["term"]
    }
  ]
}

// 503 Service Unavailable - API key not configured
{
  "error": "OPENAI_API_KEY not configured"
}
```

---

### Learn Articles API

#### GET /api/v1/learn/posts

Returns list of published articles.

**Response**

```json
{
  "articles": [
    {
      "slug": "arxiv-2401-01234",
      "title": "Understanding Spiking Neural Networks",
      "one_liner": "A comprehensive guide to SNNs for developers.",
      "code_angle": "Focus on event-driven simulation and sparse computation.",
      "bio_inspiration": "Mimics biological neurons with discrete spike events.",
      "content_md": "# Understanding Spiking Neural Networks\n\n...",
      "cover_r2_key": "covers/arxiv-2401-01234-img_abc123.png",
      "tags": ["arxiv", "snn", "tutorial"],
      "created_at": "2026-02-01T10:00:00.000Z",
      "updated_at": "2026-02-01T10:00:00.000Z"
    }
  ]
}
```

#### GET /api/v1/learn/posts/:slug

Returns a single article by slug.

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | string | Article URL slug |

**Response (Success)**

```json
{
  "article": {
    "slug": "arxiv-2401-01234",
    "title": "Understanding Spiking Neural Networks",
    "one_liner": "A comprehensive guide to SNNs for developers.",
    "code_angle": "Focus on event-driven simulation and sparse computation.",
    "bio_inspiration": "Mimics biological neurons with discrete spike events.",
    "content_md": "# Understanding Spiking Neural Networks\n\n...",
    "cover_r2_key": "covers/arxiv-2401-01234-img_abc123.png",
    "tags": ["arxiv", "snn", "tutorial"],
    "created_at": "2026-02-01T10:00:00.000Z",
    "updated_at": "2026-02-01T10:00:00.000Z"
  }
}
```

**Response (Not Found)**

```json
{
  "error": "Not Found"
}
```

---

### SSR Pages

#### GET /learn

Server-side rendered article index page.

**Response**: HTML page with article list

#### GET /learn/:slug

Server-side rendered article detail page.

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | string | Article URL slug |

**Response**: HTML page with article content

---

### Assets

#### GET /assets/:key

Serves static assets from R2 storage.

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | string | R2 object key (e.g., `covers/article-img.png`) |

**Response Headers**

```http
Content-Type: image/png
ETag: "abc123"
Cache-Control: public, max-age=31536000, immutable
```

**Response**: Binary file content

---

### Admin Endpoints

#### POST /api/internal/ingest/tick

Triggers the content ingestion pipeline manually.

**Authentication**: Required (Bearer token)

**Response**

```json
{
  "ok": true,
  "fetched": 10,
  "processed": 2
}
```

| Field | Description |
|-------|-------------|
| `fetched` | Number of papers fetched from arXiv/OpenReview |
| `processed` | Number of papers processed (summarized + cover) |

#### POST /api/internal/demo/publish

Creates a demo article for testing.

**Authentication**: Required (Bearer token)

**Response**

```json
{
  "ok": true,
  "slug": "demo-1706976000000"
}
```

#### POST /api/internal/demo/cover

Generates a cover image for an existing article.

**Authentication**: Required (Bearer token)

**Request Body**

```json
{
  "slug": "demo-1706976000000"
}
```

**Response**

```json
{
  "ok": true,
  "key": "covers/demo-1706976000000-img_xyz789.png"
}
```

---

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid auth token |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Too many requests |
| 503 | `SERVICE_UNAVAILABLE` | External service unavailable |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

**Error Response Format**

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "issues": []  // Optional: validation issues
}
```

---

## Code Examples

### cURL

```bash
# Health check
curl https://neural-coding.com/api/v1/health

# Get tools
curl https://neural-coding.com/api/v1/playground/tools

# Explain term
curl -X POST https://neural-coding.com/api/v1/brain-context \
  -H "Content-Type: application/json" \
  -d '{"term": "LIF neuron", "lang": "en"}'

# Get articles
curl https://neural-coding.com/api/v1/learn/posts

# Get single article
curl https://neural-coding.com/api/v1/learn/posts/arxiv-2401-01234

# Admin: trigger ingestion
curl -X POST https://neural-coding.com/api/internal/ingest/tick \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### JavaScript (Fetch)

```javascript
// Get tools
async function getTools() {
  const response = await fetch('https://neural-coding.com/api/v1/playground/tools');
  if (!response.ok) throw new Error('Failed to fetch tools');
  return response.json();
}

// Explain term
async function explainTerm(term, lang = 'en') {
  const response = await fetch('https://neural-coding.com/api/v1/brain-context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ term, lang })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to explain term');
  }

  return response.json();
}

// Get articles
async function getArticles() {
  const response = await fetch('https://neural-coding.com/api/v1/learn/posts');
  if (!response.ok) throw new Error('Failed to fetch articles');
  const data = await response.json();
  return data.articles;
}

// Get single article
async function getArticle(slug) {
  const response = await fetch(`https://neural-coding.com/api/v1/learn/posts/${slug}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch article');
  }
  const data = await response.json();
  return data.article;
}

// Usage
const tools = await getTools();
console.log(tools);

const explanation = await explainTerm('spike train');
console.log(explanation.answer_md);

const articles = await getArticles();
console.log(`Found ${articles.length} articles`);
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://neural-coding.com',
  timeout: 10000
});

// Get tools
async function getTools() {
  const { data } = await api.get('/api/v1/playground/tools');
  return data.tools;
}

// Explain term
async function explainTerm(term, lang = 'en') {
  const { data } = await api.post('/api/v1/brain-context', { term, lang });
  return data;
}

// Get articles with error handling
async function getArticles() {
  try {
    const { data } = await api.get('/api/v1/learn/posts');
    return data.articles;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data?.error);
    }
    throw error;
  }
}
```

### Python (Requests)

```python
import requests

BASE_URL = "https://neural-coding.com"

def get_tools():
    """Fetch available tools."""
    response = requests.get(f"{BASE_URL}/api/v1/playground/tools")
    response.raise_for_status()
    return response.json()["tools"]

def explain_term(term: str, lang: str = "en") -> dict:
    """Get AI explanation for a neuroscience term."""
    response = requests.post(
        f"{BASE_URL}/api/v1/brain-context",
        json={"term": term, "lang": lang}
    )
    response.raise_for_status()
    return response.json()

def get_articles() -> list:
    """Fetch all published articles."""
    response = requests.get(f"{BASE_URL}/api/v1/learn/posts")
    response.raise_for_status()
    return response.json()["articles"]

def get_article(slug: str) -> dict | None:
    """Fetch a single article by slug."""
    response = requests.get(f"{BASE_URL}/api/v1/learn/posts/{slug}")
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()["article"]

# Admin functions (require ADMIN_TOKEN)
def trigger_ingestion(admin_token: str) -> dict:
    """Trigger content ingestion pipeline."""
    response = requests.post(
        f"{BASE_URL}/api/internal/ingest/tick",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    response.raise_for_status()
    return response.json()

# Usage
if __name__ == "__main__":
    # Get tools
    tools = get_tools()
    for tool in tools:
        print(f"- {tool['name']} ({tool['status']})")

    # Explain a term
    result = explain_term("membrane potential")
    print(f"\nExplanation (cached={result['cached']}):")
    print(result["answer_md"][:200] + "...")

    # Get articles
    articles = get_articles()
    print(f"\nFound {len(articles)} articles")
```

### Python (aiohttp - Async)

```python
import aiohttp
import asyncio

BASE_URL = "https://neural-coding.com"

async def get_tools(session: aiohttp.ClientSession) -> list:
    async with session.get(f"{BASE_URL}/api/v1/playground/tools") as response:
        response.raise_for_status()
        data = await response.json()
        return data["tools"]

async def explain_term(
    session: aiohttp.ClientSession,
    term: str,
    lang: str = "en"
) -> dict:
    async with session.post(
        f"{BASE_URL}/api/v1/brain-context",
        json={"term": term, "lang": lang}
    ) as response:
        response.raise_for_status()
        return await response.json()

async def get_articles(session: aiohttp.ClientSession) -> list:
    async with session.get(f"{BASE_URL}/api/v1/learn/posts") as response:
        response.raise_for_status()
        data = await response.json()
        return data["articles"]

async def main():
    async with aiohttp.ClientSession() as session:
        # Fetch tools and articles concurrently
        tools, articles = await asyncio.gather(
            get_tools(session),
            get_articles(session)
        )

        print(f"Tools: {len(tools)}")
        print(f"Articles: {len(articles)}")

        # Explain multiple terms concurrently
        terms = ["LIF neuron", "STDP", "Hebbian learning"]
        explanations = await asyncio.gather(*[
            explain_term(session, term) for term in terms
        ])

        for term, exp in zip(terms, explanations):
            print(f"\n{term}: {exp['answer_md'][:100]}...")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Webhooks (Future)

*Note: Webhooks are planned for future implementation.*

### Article Published

```json
{
  "event": "article.published",
  "timestamp": "2026-02-03T12:00:00.000Z",
  "data": {
    "slug": "arxiv-2401-01234",
    "title": "Understanding SNNs",
    "url": "https://neural-coding.com/learn/arxiv-2401-01234"
  }
}
```

### Ingestion Complete

```json
{
  "event": "ingestion.complete",
  "timestamp": "2026-02-03T12:00:00.000Z",
  "data": {
    "fetched": 10,
    "processed": 2,
    "failed": 0
  }
}
```

---

## SDK (Future)

*Note: Official SDKs are planned for future implementation.*

### Planned SDKs

- `@neural-coding/js` - JavaScript/TypeScript
- `neural-coding-py` - Python
- `neural-coding-go` - Go

### Example (Planned JS SDK)

```javascript
import { NeuralCoding } from '@neural-coding/js';

const client = new NeuralCoding({
  // Optional: for admin operations
  adminToken: process.env.ADMIN_TOKEN
});

// Get tools
const tools = await client.tools.list();

// Explain term
const explanation = await client.brainContext.explain('LIF neuron', 'en');

// Get articles
const articles = await client.learn.list();
const article = await client.learn.get('arxiv-2401-01234');
```
