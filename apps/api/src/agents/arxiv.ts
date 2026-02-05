import { XMLParser } from "fast-xml-parser";

export type ArxivEntry = {
  source: "arxiv";
  sourceId: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedAt: string;
  pdfUrl?: string;
  categories: string[];
};

export async function fetchArxiv(params: { query: string; maxResults: number }): Promise<ArxivEntry[]> {
  const url = new URL("https://export.arxiv.org/api/query");
  url.searchParams.set("search_query", params.query);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(params.maxResults));
  url.searchParams.set("sortBy", "submittedDate");
  url.searchParams.set("sortOrder", "descending");

  const res = await fetch(url.toString(), { headers: { "user-agent": "neural-coding.com (ingest bot)" } });
  if (!res.ok) throw new Error(`arXiv fetch failed: ${res.status} ${await res.text()}`);

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true
  });
  const data = parser.parse(xml) as any;

  const feed = data?.feed;
  const entries = feed?.entry ? (Array.isArray(feed.entry) ? feed.entry : [feed.entry]) : [];

  return entries
    .map((e: any): ArxivEntry | null => {
      const idUrl = String(e?.id ?? "");
      const sourceId = idUrl.split("/abs/").pop()?.trim() || "";
      if (!sourceId) return null;

      const title = String(e?.title ?? "").replaceAll(/\s+/g, " ").trim();
      const abstract = String(e?.summary ?? "").replaceAll(/\s+/g, " ").trim();
      const publishedAt = String(e?.published ?? "").trim();

      const authorNode = e?.author;
      const authors = (Array.isArray(authorNode) ? authorNode : authorNode ? [authorNode] : [])
        .map((a: any) => String(a?.name ?? "").trim())
        .filter(Boolean);

      const categoryNode = e?.category;
      const categories = (Array.isArray(categoryNode) ? categoryNode : categoryNode ? [categoryNode] : [])
        .map((c: any) => String(c?.["@_term"] ?? "").trim())
        .filter(Boolean);

      const links = e?.link ? (Array.isArray(e.link) ? e.link : [e.link]) : [];
      const pdfLink = links.find((l: any) => l?.["@_type"] === "application/pdf" || String(l?.["@_title"] ?? "").toLowerCase() === "pdf");
      const pdfUrl = typeof pdfLink?.["@_href"] === "string" ? String(pdfLink["@_href"]) : undefined;

      return {
        source: "arxiv",
        sourceId,
        title,
        abstract,
        authors,
        publishedAt,
        pdfUrl,
        categories
      };
    })
    .filter((x: ArxivEntry | null): x is ArxivEntry => Boolean(x));
}

