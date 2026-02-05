from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Paper:
    source: str
    source_id: str
    title: str
    authors: list[str]
    abstract: str
    url: str
    pdf_url: str | None
    categories: list[str]
    published_at: datetime

