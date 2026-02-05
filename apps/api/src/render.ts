import { escapeHtml, htmlDoc } from "./lib/html";
import type { LearnArticleRow } from "./db";

// ============================================================================
// Markdown Rendering (lightweight, no external deps)
// ============================================================================

/**
 * Convert markdown to HTML (lightweight implementation for Cloudflare Workers)
 * Supports: headers, bold, italic, code, links, lists, blockquotes, horizontal rules
 */
function renderMarkdown(md: string): string {
  if (!md) return "";

  let html = escapeHtml(md);

  // Code blocks (``` ... ```) - must be processed first
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${langClass}>${code.trim()}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers (# to ######)
  html = html.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic (*text* or _text_)
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Strikethrough (~~text~~)
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');

  // Images ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" style="max-width:100%;border-radius:8px">');

  // Blockquotes (> text)
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, "\n");

  // Horizontal rules (---, ***, ___)
  html = html.replace(/^(---|\*\*\*|___)$/gm, "<hr>");

  // Unordered lists (- item or * item)
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  // Wrap consecutive <li> not in <ul> into <ol>
  html = html.replace(/(<li>.*<\/li>\n?)(?!<\/ul>)/g, (match, p1, offset, str) => {
    // Check if already wrapped
    const before = str.substring(Math.max(0, offset - 5), offset);
    if (before.includes("<ul>") || before.includes("<ol>")) return match;
    return match;
  });

  // Paragraphs (double newlines)
  html = html.replace(/\n\n+/g, "</p><p>");
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");
  html = html.replace(/<p>(<h[1-6]>)/g, "$1");
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, "$1");
  html = html.replace(/<p>(<pre>)/g, "$1");
  html = html.replace(/(<\/pre>)<\/p>/g, "$1");
  html = html.replace(/<p>(<ul>)/g, "$1");
  html = html.replace(/(<\/ul>)<\/p>/g, "$1");
  html = html.replace(/<p>(<ol>)/g, "$1");
  html = html.replace(/(<\/ol>)<\/p>/g, "$1");
  html = html.replace(/<p>(<blockquote>)/g, "$1");
  html = html.replace(/(<\/blockquote>)<\/p>/g, "$1");
  html = html.replace(/<p>(<hr>)<\/p>/g, "$1");

  // Single newlines to <br> within paragraphs
  html = html.replace(/([^>])\n([^<])/g, "$1<br>$2");

  return html;
}

// ============================================================================
// Page Rendering
// ============================================================================

export function renderLearnIndex(params: { articles: LearnArticleRow[]; origin: string }): string {
  const cards = params.articles
    .map((a) => {
      const tags = safeJsonArray(a.tags_json).slice(0, 6);
      const tagHtml = tags.length ? `<div class="muted">${tags.map((t) => `#${escapeHtml(t)}`).join(" ")}</div>` : "";
      const cover = a.cover_r2_key
        ? `<div style="margin-top:10px"><img src="${escapeHtml(
            assetPath(a.cover_r2_key)
          )}" alt="" style="width:100%;height:auto;border-radius:12px;border:1px solid rgba(255,255,255,0.08)" loading="lazy" /></div>`
        : "";
      return `<div class="card">
  <h2><a href="/learn/${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h2>
  <p class="muted">${escapeHtml(a.one_liner)}</p>
  ${tagHtml}
  ${cover}
</div>`;
    })
    .join("\n");

  return htmlDoc({
    title: "Learn | Neural-coding.com",
    description: "神经科学/神经形态计算：论文解读与代码视角。",
    canonicalUrl: `${params.origin}/learn`,
    og: { type: "website", url: `${params.origin}/learn` },
    body: `<h1>Learn</h1>
<p class="muted">自动化生成的论文解读（含一句话总结、代码角度、生物启发）。</p>
<div class="grid">${cards || `<div class="card"><p>暂无文章。先跑一次 ingest job。</p></div>`}</div>`
  });
}

/**
 * Render a single learn article page with full markdown content
 * @param params - Article data and origin URL
 * @returns Complete HTML page
 */
export function renderLearnArticle(params: { article: LearnArticleRow; origin: string }): string {
  const a = params.article;
  const tags = safeJsonArray(a.tags_json);
  const coverUrl = a.cover_r2_key ? `${params.origin}${assetPath(a.cover_r2_key)}` : null;
  const cover = a.cover_r2_key
    ? `<img src="${escapeHtml(assetPath(a.cover_r2_key))}" alt="Cover" style="width:100%;max-width:720px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);display:block;margin:12px 0">`
    : "";

  // Render markdown content to HTML
  const contentHtml = renderMarkdown(a.content_md);

  const body = `<h1>${escapeHtml(a.title)}</h1>
<p class="muted">${escapeHtml(a.one_liner)}</p>
${cover}
${tags.length ? `<p class="muted">${tags.map((t) => `#${escapeHtml(t)}`).join(" ")}</p>` : ""}
<div class="card">
  <h3>Code Angle</h3>
  <p>${escapeHtml(a.code_angle)}</p>
  <h3>Bio Inspiration</h3>
  <p>${escapeHtml(a.bio_inspiration)}</p>
</div>
<article class="content" style="margin-top:24px;line-height:1.8">
  ${contentHtml}
</article>
<p class="muted" style="margin-top:32px;font-size:14px">Last updated: ${escapeHtml(a.updated_at)}</p>`;

  const canonicalUrl = `${params.origin}/learn/${encodeURIComponent(a.slug)}`;
  return htmlDoc({
    title: `${a.title} | Neural-coding.com`,
    description: a.one_liner,
    canonicalUrl,
    og: { type: "article", url: canonicalUrl, image: coverUrl ?? undefined },
    body
  });
}

function safeJsonArray(input: string): string[] {
  try {
    const v = JSON.parse(input);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function assetPath(key: string): string {
  const safe = key
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `/assets/${safe}`;
}
