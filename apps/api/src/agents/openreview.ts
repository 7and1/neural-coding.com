export type OpenReviewEntry = {
  source: "openreview";
  sourceId: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedAt: string; // ISO
  pdfUrl?: string;
  categories: string[];
};

type OpenReviewNote = {
  id?: string;
  forum?: string;
  tcdate?: number;
  content?: Record<string, unknown>;
};

function getContentString(content: Record<string, unknown> | undefined, key: string): string {
  if (!content) return "";
  const raw = content[key];
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object" && "value" in (raw as any) && typeof (raw as any).value === "string") return String((raw as any).value).trim();
  return "";
}

function getContentStringArray(content: Record<string, unknown> | undefined, key: string): string[] {
  if (!content) return [];
  const raw = content[key];
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string").map((x) => String(x).trim()).filter(Boolean);
  if (raw && typeof raw === "object" && "value" in (raw as any) && Array.isArray((raw as any).value)) {
    return (raw as any).value.filter((x: any) => typeof x === "string").map((x: any) => String(x).trim()).filter(Boolean);
  }
  return [];
}

export async function fetchOpenReview(params: { apiBase?: string; invitations: string[]; maxResults: number }): Promise<OpenReviewEntry[]> {
  const apiBase = (params.apiBase || "https://api.openreview.net").replace(/\/+$/, "");
  const invitations = params.invitations.map((s) => s.trim()).filter(Boolean);
  if (!invitations.length) return [];

  const seen = new Set<string>();
  const out: OpenReviewEntry[] = [];

  for (const inv of invitations) {
    const url = new URL(`${apiBase}/notes`);
    url.searchParams.set("invitation", inv);
    url.searchParams.set("limit", String(Math.max(1, params.maxResults)));
    url.searchParams.set("sort", "tcdate:desc");

    const res = await fetch(url.toString(), { headers: { "user-agent": "neural-coding.com (ingest bot)" } });
    if (!res.ok) throw new Error(`OpenReview fetch failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { notes?: OpenReviewNote[] };

    const notes = Array.isArray(data?.notes) ? data.notes : [];
    for (const n of notes) {
      const id = (typeof n.id === "string" && n.id) || (typeof n.forum === "string" && n.forum) || "";
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const content = n.content && typeof n.content === "object" ? (n.content as Record<string, unknown>) : undefined;
      const title = getContentString(content, "title").replaceAll(/\s+/g, " ").trim();
      const abstract = getContentString(content, "abstract").replaceAll(/\s+/g, " ").trim();
      if (!title || !abstract) continue;

      const authors = getContentStringArray(content, "authors");
      const tcdate = typeof n.tcdate === "number" ? n.tcdate : Date.now();
      const publishedAt = new Date(tcdate).toISOString();

      const pdf = getContentString(content, "pdf");
      const pdfUrl = pdf || `https://openreview.net/pdf?id=${encodeURIComponent(id)}`;

      out.push({
        source: "openreview",
        sourceId: id,
        title,
        abstract,
        authors,
        publishedAt,
        pdfUrl,
        categories: ["openreview", inv]
      });
    }
  }

  return out.slice(0, params.maxResults);
}

