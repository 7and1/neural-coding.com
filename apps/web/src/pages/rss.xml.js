import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = (await getCollection("learn"))
    .filter((p) => !p.data.draft)
    .sort(
      (a, b) => new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime()
    );

  return rss({
    title: "neural-coding.com",
    description: "Brain-inspired computation, spiking neural networks, and practical simulators. Research-to-code articles and interactive tools.",
    site: context.site,
    xmlns: {
      atom: "http://www.w3.org/2005/Atom",
    },
    customData: `<language>en-us</language>
<atom:link href="${context.site}rss.xml" rel="self" type="application/rss+xml" />
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<managingEditor>team@neural-coding.com (Neural-Coding Team)</managingEditor>
<webMaster>team@neural-coding.com (Neural-Coding Team)</webMaster>`,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description ?? "",
      pubDate: new Date(p.data.publishedAt),
      link: `/learn/${p.slug}/`,
      author: p.data.author ?? "Neural-Coding Team",
      categories: p.data.tags,
      customData: p.data.cover ? `<enclosure url="${p.data.cover}" type="image/png" />` : "",
    }))
  });
}

