export type ToolId =
  | "lif-explorer"
  | "synaptic-weight-visualizer"
  | "neural-code-transpiler"
  | "neuro-data-formatter";

export type ToolMeta = {
  id: ToolId;
  name: string;
  description: string;
  path: string;
  status: "alpha" | "beta" | "stable";
};

export type LearnArticle = {
  slug: string;
  title: string;
  one_liner: string;
  code_angle: string;
  bio_inspiration: string;
  content_md: string;
  cover_r2_key?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

