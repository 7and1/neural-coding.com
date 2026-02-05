import { defineCollection, z } from "astro:content";

const learn = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishedAt: z.string(),
    modifiedAt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    author: z.string().default("Neural-Coding Team"),
    draft: z.boolean().default(false),
  })
});

export const collections = { learn };

