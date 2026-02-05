import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://neural-coding.com",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/api/internal/"),
      changefreq: "weekly",
      priority: 0.7,
      lastmod: new Date(),
      serialize: (item) => {
        // Boost priority for key pages
        if (item.url === "https://neural-coding.com/") {
          item.priority = 1.0;
          item.changefreq = "daily";
        } else if (item.url.includes("/learn/") && !item.url.endsWith("/learn/")) {
          item.priority = 0.8;
        }
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
  build: {
    inlineStylesheets: "auto",
  },
  compressHTML: true,
  vite: {
    build: {
      cssMinify: true,
      minify: "esbuild",
    },
  },
});

