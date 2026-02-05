from __future__ import annotations

from dataclasses import dataclass

from sources.types import Paper


@dataclass
class PaperSummary:
    one_sentence: str
    code_angle: str
    bio_inspiration: str

    def to_markdown(self, paper: Paper) -> str:
        return f"""## One-sentence summary

{self.one_sentence}

## The "code" angle

{self.code_angle}

## Bio-inspiration

{self.bio_inspiration}

## Source

- Title: {paper.title}
- URL: {paper.url}
- Published: {paper.published_at.isoformat()}
"""


def summarize_paper(paper: Paper, *, mock: bool) -> PaperSummary:
    if mock:
        return PaperSummary(
            one_sentence=f"A concise, reproducible summary of: {paper.title}",
            code_angle="Implement the core idea as a minimal simulator; start with a LIF baseline, then add the paper's novelty as a delta.",
            bio_inspiration="Identify which neural signal (rate/timing/synchrony) is assumed to carry information and how learning changes synapses or excitability.",
        )

    # Real LLM integration is intentionally not hard-coded here to avoid credential leaks.
    # Recommended: implement provider calls in a private repo / CI secret context.
    raise RuntimeError("Set MOCK_LLM=1 or implement a provider call in scripts/pipeline/summarize.py")
