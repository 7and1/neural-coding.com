# Architecture Diagrams

Comprehensive architecture documentation for neural-coding.com using Mermaid diagrams.

## System Architecture (C4 Context)

High-level view of the system and its external dependencies.

```mermaid
C4Context
    title System Context Diagram - neural-coding.com

    Person(user, "User", "Researchers, developers, students interested in neural coding")
    Person(admin, "Admin", "Content administrator")

    System(neuralcoding, "neural-coding.com", "Educational platform for neural coding research")

    System_Ext(arxiv, "arXiv", "Research paper repository")
    System_Ext(openreview, "OpenReview", "Conference paper submissions")
    System_Ext(openai, "OpenAI API", "Content generation and summarization")
    System_Ext(cloudflare, "Cloudflare", "Edge hosting platform")

    Rel(user, neuralcoding, "Reads articles, uses tools")
    Rel(admin, neuralcoding, "Manages content, triggers pipelines")
    Rel(neuralcoding, arxiv, "Fetches papers")
    Rel(neuralcoding, openreview, "Fetches papers")
    Rel(neuralcoding, openai, "Generates summaries")
    Rel(neuralcoding, cloudflare, "Hosted on")
```

## Container Diagram

Shows the major containers/services in the system.

```mermaid
C4Container
    title Container Diagram - neural-coding.com

    Person(user, "User")

    Container_Boundary(cf, "Cloudflare Edge") {
        Container(web, "Web App", "Astro/Pages", "Static site with SSR capabilities")
        Container(api, "API Worker", "Hono/Workers", "REST API and business logic")
        ContainerDb(d1, "D1 Database", "SQLite", "Papers, articles, tools, analytics")
        ContainerDb(r2, "R2 Storage", "Object Storage", "Images, assets, covers")
    }

    Container_Boundary(tools, "Tools Infrastructure") {
        Container(streamlit, "Streamlit Apps", "Python/Docker", "Interactive visualization tools")
        Container(nginx, "Nginx Proxy", "Nginx", "Reverse proxy for tools")
    }

    Rel(user, web, "HTTPS")
    Rel(web, api, "Fetch API")
    Rel(api, d1, "SQL queries")
    Rel(api, r2, "Get/Put objects")
    Rel(user, streamlit, "HTTPS via proxy")
    Rel(nginx, streamlit, "Proxy requests")
```

## Data Flow Diagram

Shows how data flows through the system during key operations.

```mermaid
flowchart TB
    subgraph External["External Sources"]
        arxiv[arXiv API]
        openreview[OpenReview API]
        openai[OpenAI API]
    end

    subgraph Ingestion["Paper Ingestion Pipeline"]
        cron[Cron Trigger<br/>Every 6 hours]
        fetch[Fetch Papers]
        parse[Parse & Validate]
        store[Store in D1]
    end

    subgraph Generation["Content Generation"]
        summarize[Generate Summary]
        cover[Generate Cover Image]
        publish[Publish Article]
    end

    subgraph Storage["Data Storage"]
        d1[(D1 Database)]
        r2[(R2 Bucket)]
    end

    subgraph Delivery["Content Delivery"]
        api[API Worker]
        web[Web App]
        user((User))
    end

    cron --> fetch
    fetch --> arxiv
    fetch --> openreview
    arxiv --> parse
    openreview --> parse
    parse --> store
    store --> d1

    d1 --> summarize
    summarize --> openai
    openai --> summarize
    summarize --> cover
    cover --> openai
    openai --> cover
    cover --> r2
    cover --> publish
    publish --> d1

    d1 --> api
    r2 --> api
    api --> web
    web --> user
```

## Sequence Diagram: Article Retrieval

Shows the flow when a user requests an article.

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web (Astro)
    participant A as API Worker
    participant D as D1 Database
    participant R as R2 Storage
    participant C as Cache

    U->>W: GET /learn/article-slug
    W->>A: GET /api/learn/article-slug

    A->>C: Check cache
    alt Cache hit
        C-->>A: Return cached article
    else Cache miss
        A->>D: SELECT * FROM learn_articles WHERE slug = ?
        D-->>A: Article data
        A->>R: GET cover image (if exists)
        R-->>A: Image data
        A->>C: Store in cache
    end

    A-->>W: JSON response
    W->>W: Render markdown to HTML
    W-->>U: HTML page
```

## Sequence Diagram: Paper Ingestion

Shows the automated paper ingestion flow.

```mermaid
sequenceDiagram
    participant CR as Cron Trigger
    participant A as API Worker
    participant AR as arXiv API
    participant AI as OpenAI API
    participant D as D1 Database
    participant R as R2 Storage

    CR->>A: Trigger scheduled event
    A->>D: Create job record (status: running)

    A->>AR: Fetch recent papers
    AR-->>A: Paper list (XML)

    loop For each paper
        A->>D: Check if paper exists
        alt New paper
            A->>D: INSERT INTO papers
            A->>AI: Generate summary
            AI-->>A: Summary content
            A->>AI: Generate cover image
            AI-->>A: Image data
            A->>R: PUT cover image
            A->>D: INSERT INTO learn_articles
        end
    end

    A->>D: Update job record (status: done)
```

## Deployment Architecture

Shows the deployment topology.

```mermaid
flowchart TB
    subgraph Internet
        user((Users))
        admin((Admin))
    end

    subgraph Cloudflare["Cloudflare Edge Network"]
        subgraph DNS["DNS & SSL"]
            dns[DNS Resolution]
            ssl[SSL Termination]
        end

        subgraph Edge["Edge Locations (Global)"]
            pages[Cloudflare Pages<br/>neural-coding.com]
            workers[Cloudflare Workers<br/>api.neural-coding.com]
        end

        subgraph Storage["Storage Layer"]
            d1[(D1 Database<br/>SQLite at Edge)]
            r2[(R2 Object Storage<br/>Assets & Images)]
        end
    end

    subgraph VPS["VPS Server (Optional)"]
        docker[Docker Host]
        nginx[Nginx Reverse Proxy]
        streamlit1[Streamlit App 1]
        streamlit2[Streamlit App 2]
    end

    user --> dns
    admin --> dns
    dns --> ssl
    ssl --> pages
    ssl --> workers
    pages --> workers
    workers --> d1
    workers --> r2

    user --> nginx
    nginx --> streamlit1
    nginx --> streamlit2
    docker --> streamlit1
    docker --> streamlit2
```

## Database Schema (ERD)

Entity-Relationship Diagram for the D1 database.

```mermaid
erDiagram
    papers {
        text id PK
        text source
        text source_id UK
        text title
        text abstract
        text authors_json
        text published_at
        text pdf_url
        text categories_json
        text created_at
        text updated_at
    }

    learn_articles {
        text slug PK
        text title
        text one_liner
        text code_angle
        text bio_inspiration
        text content_md
        text cover_r2_key
        text source_paper_id FK
        text status
        text tags_json
        text created_at
        text updated_at
    }

    term_explanations {
        text term PK
        text answer_md
        text model
        text created_at
        text updated_at
    }

    jobs {
        text id PK
        text kind
        text status
        text input_json
        text output_json
        text error
        text created_at
        text updated_at
    }

    tools {
        text id PK
        text name
        text description
        text icon
        text url
        text category
        text status
        integer order_index
        text created_at
        text updated_at
    }

    page_views {
        text id PK
        text page_path
        text referrer
        text user_agent
        text ip_hash
        text created_at
    }

    rate_limits {
        text ip_hash PK
        text endpoint PK
        text window_start PK
        integer request_count
    }

    papers ||--o{ learn_articles : "source_paper_id"
```

## API Routes Flowchart

Shows the API routing structure.

```mermaid
flowchart LR
    subgraph Public["Public Endpoints"]
        health["/api/health"]
        learn_list["/api/learn"]
        learn_single["/api/learn/:slug"]
        tools_list["/api/tools"]
        assets["/assets/*"]
        search["/api/search"]
    end

    subgraph Protected["Admin Endpoints"]
        ingest["/api/admin/ingest"]
        jobs["/api/admin/jobs"]
        analytics["/api/admin/analytics"]
    end

    subgraph SSR["SSR Routes"]
        learn_index["/learn"]
        learn_article["/learn/:slug"]
    end

    request((Request)) --> router{Router}

    router --> |"GET /api/health"| health
    router --> |"GET /api/learn"| learn_list
    router --> |"GET /api/learn/:slug"| learn_single
    router --> |"GET /api/tools"| tools_list
    router --> |"GET /assets/*"| assets
    router --> |"GET /api/search"| search

    router --> |"POST /api/admin/*"| auth{Auth Check}
    auth --> |Valid Token| ingest
    auth --> |Valid Token| jobs
    auth --> |Valid Token| analytics
    auth --> |Invalid| reject[401 Unauthorized]

    router --> |"GET /learn"| learn_index
    router --> |"GET /learn/:slug"| learn_article

    health --> response((Response))
    learn_list --> response
    learn_single --> response
    tools_list --> response
    assets --> response
    search --> response
    ingest --> response
    jobs --> response
    analytics --> response
    learn_index --> response
    learn_article --> response
    reject --> response
```

## Component Interaction

Shows how frontend components interact with the API.

```mermaid
flowchart TB
    subgraph Frontend["Astro Frontend"]
        subgraph Pages
            home[Home Page]
            learn_idx[Learn Index]
            learn_art[Article Page]
            tools_pg[Tools Page]
        end

        subgraph Components
            nav[Nav Component]
            footer[Footer Component]
            card[Article Card]
            filter[Tag Filter]
        end

        subgraph Layouts
            base[Base Layout]
        end
    end

    subgraph API["API Worker"]
        learn_api[Learn API]
        tools_api[Tools API]
        assets_api[Assets API]
    end

    home --> base
    learn_idx --> base
    learn_art --> base
    tools_pg --> base

    base --> nav
    base --> footer

    learn_idx --> card
    learn_idx --> filter
    learn_idx --> learn_api

    learn_art --> learn_api
    learn_art --> assets_api

    tools_pg --> tools_api
```

## Rate Limiting Flow

Shows how rate limiting is implemented.

```mermaid
flowchart TB
    request((Incoming Request)) --> extract[Extract IP Hash]
    extract --> lookup[Lookup Rate Limit Record]
    lookup --> d1[(D1 Database)]

    d1 --> check{Count < Limit?}

    check --> |Yes| increment[Increment Counter]
    increment --> d1
    increment --> process[Process Request]
    process --> response((Response))

    check --> |No| reject[Return 429]
    reject --> headers[Add Retry-After Header]
    headers --> response

    subgraph Cleanup["Background Cleanup"]
        cron[Cron Job] --> delete[Delete Old Windows]
        delete --> d1
    end
```

## Caching Strategy

Shows the multi-layer caching approach.

```mermaid
flowchart TB
    request((Request)) --> edge{Edge Cache}

    edge --> |Hit| edge_response[Return Cached]
    edge --> |Miss| worker[Worker]

    worker --> kv{KV Cache}
    kv --> |Hit| kv_response[Return from KV]
    kv --> |Miss| d1[(D1 Database)]

    d1 --> store_kv[Store in KV]
    store_kv --> store_edge[Store in Edge]
    store_edge --> response((Response))

    edge_response --> response
    kv_response --> store_edge

    subgraph TTL["Cache TTL"]
        edge_ttl[Edge: 5 min]
        kv_ttl[KV: 1 hour]
        d1_ttl[D1: Source of truth]
    end
```

## Error Handling Flow

Shows how errors are handled throughout the system.

```mermaid
flowchart TB
    request((Request)) --> try{Try Block}

    try --> |Success| success[Return Response]
    try --> |Error| catch[Catch Error]

    catch --> classify{Error Type}

    classify --> |Validation| e400[400 Bad Request]
    classify --> |Auth| e401[401 Unauthorized]
    classify --> |Not Found| e404[404 Not Found]
    classify --> |Rate Limit| e429[429 Too Many Requests]
    classify --> |Internal| e500[500 Internal Error]

    e400 --> log[Log Error]
    e401 --> log
    e404 --> log
    e429 --> log
    e500 --> log

    log --> format[Format Error Response]
    format --> response((Error Response))
    success --> response
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| Rectangle | Process/Service |
| Cylinder | Database/Storage |
| Diamond | Decision |
| Circle | Start/End |
| Parallelogram | Input/Output |

## Tools for Viewing

These diagrams use [Mermaid](https://mermaid.js.org/) syntax. View them in:

- GitHub (native support)
- VS Code with Mermaid extension
- [Mermaid Live Editor](https://mermaid.live/)
- Any Markdown viewer with Mermaid support
