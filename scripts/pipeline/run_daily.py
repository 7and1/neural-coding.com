from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from slugify import slugify

from sources.arxiv_source import fetch_arxiv
from summarize import summarize_paper


@dataclass
class DailyConfig:
    out_dir: Path
    max_items: int
    mock_llm: bool


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    out_dir = repo_root / "apps" / "web" / "src" / "content" / "learn"

    cfg = DailyConfig(
        out_dir=out_dir,
        max_items=int(os.getenv("MAX_ITEMS", "2")),
        mock_llm=os.getenv("MOCK_LLM", "1") == "1",
    )

    items = fetch_arxiv(max_results=cfg.max_items)
    out_dir.mkdir(parents=True, exist_ok=True)

    for p in items:
        s = summarize_paper(p, mock=cfg.mock_llm)
        slug = slugify(f"{p.source}-{p.source_id}-{p.title}")[:80]
        published = p.published_at.astimezone(timezone.utc).date().isoformat()

        md_path = cfg.out_dir / f"{slug}.md"
        if md_path.exists():
            continue

        md = render_post_markdown(
            title=p.title,
            description=s.one_sentence,
            published_at=f"{published}",
            tags=["paper", p.source, "neural-coding"],
            body=s.to_markdown(p),
        )

        md_path.write_text(md, encoding="utf-8")
        print(f"Wrote {md_path}")


def render_post_markdown(*, title: str, description: str, published_at: str, tags: list[str], body: str) -> str:
    frontmatter = (
        "---\n"
        f'title: "{escape_yaml_str(title)}"\n'
        f'description: "{escape_yaml_str(description)}"\n'
        f'publishedAt: "{published_at}"\n'
        f"tags: [{', '.join([json_str(t) for t in tags])}]\n"
        "---\n\n"
    )
    return frontmatter + body.rstrip() + "\n"


def escape_yaml_str(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def json_str(s: str) -> str:
    return '"' + escape_yaml_str(s) + '"'


if __name__ == "__main__":
    main()

