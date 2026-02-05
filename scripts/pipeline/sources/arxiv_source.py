from __future__ import annotations

from datetime import datetime, timezone
from typing import List

import feedparser
import httpx

from .types import Paper


ARXIV_ATOM = "https://export.arxiv.org/api/query"


def fetch_arxiv(*, max_results: int = 10, categories: list[str] | None = None) -> list[Paper]:
    """
    Minimal arXiv Atom fetcher.
    Default categories match the user's plan: q-bio.NC, cs.NE.
    """
    cats = categories or ["q-bio.NC", "cs.NE"]
    query = " OR ".join([f"cat:{c}" for c in cats])
    params = {
        "search_query": query,
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }

    with httpx.Client(timeout=20) as client:
        r = client.get(ARXIV_ATOM, params=params)
        r.raise_for_status()

    feed = feedparser.parse(r.text)
    out: list[Paper] = []
    for e in feed.entries:
        # Example id: http://arxiv.org/abs/1234.56789v1
        url = e.get("link", "")
        source_id = url.split("/")[-1] if url else e.get("id", "unknown")
        pdf_url = None
        for l in e.get("links", []) or []:
            if l.get("type") == "application/pdf":
                pdf_url = l.get("href")
                break

        published = e.get("published") or e.get("updated") or ""
        published_at = datetime.fromisoformat(published.replace("Z", "+00:00")).astimezone(timezone.utc)
        authors = [a.get("name", "") for a in e.get("authors", []) or [] if a.get("name")]
        categories = [t.get("term", "") for t in e.get("tags", []) or [] if t.get("term")]

        out.append(
            Paper(
                source="arxiv",
                source_id=source_id,
                title=(e.get("title", "") or "").replace("\n", " ").strip(),
                authors=authors,
                abstract=(e.get("summary", "") or "").replace("\n", " ").strip(),
                url=url,
                pdf_url=pdf_url,
                categories=categories,
                published_at=published_at,
            )
        )
    return out

