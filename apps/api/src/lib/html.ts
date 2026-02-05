export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

export function htmlDoc(params: {
  title: string;
  body: string;
  description?: string;
  canonicalUrl?: string;
  og?: { type: "website" | "article"; url?: string; image?: string };
}): string {
  const descriptionMeta = params.description
    ? `<meta name="description" content="${escapeHtml(params.description)}">`
    : "";
  const canonicalMeta = params.canonicalUrl ? `<link rel="canonical" href="${escapeHtml(params.canonicalUrl)}">` : "";
  const ogType = params.og?.type ? `<meta property="og:type" content="${escapeHtml(params.og.type)}">` : "";
  const ogUrl = params.og?.url ? `<meta property="og:url" content="${escapeHtml(params.og.url)}">` : "";
  const ogTitle = `<meta property="og:title" content="${escapeHtml(params.title)}">`;
  const ogDesc = params.description ? `<meta property="og:description" content="${escapeHtml(params.description)}">` : "";
  const ogImage = params.og?.image ? `<meta property="og:image" content="${escapeHtml(params.og.image)}">` : "";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index,follow">
  ${descriptionMeta}
  ${canonicalMeta}
  <title>${escapeHtml(params.title)}</title>
  ${ogType}
  ${ogUrl}
  ${ogTitle}
  ${ogDesc}
  ${ogImage}
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background: #0b1020; color: #e6e8ef; }
    a { color: #8ab4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 32px 20px; }
    .muted { color: #a6accd; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; }
    .grid { display: grid; grid-template-columns: repeat(1, minmax(0, 1fr)); gap: 14px; }
    @media (min-width: 900px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 6px; }
    .topbar { display:flex; gap: 12px; align-items:center; margin-bottom: 18px; }
    .topbar a { padding: 6px 10px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); }
    .topbar a:hover { background: rgba(255,255,255,0.07); }
    h1 { font-size: 28px; margin: 6px 0 12px; }
    h2 { font-size: 18px; margin: 0 0 8px; }
    p { line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <a href="/">Home</a>
      <a href="/playground/">Playground</a>
      <a href="/learn">Learn</a>
      <a href="/api/">API</a>
    </div>
    ${params.body}
  </div>
</body>
</html>`;
}
