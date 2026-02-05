export type Env = {
  DB: D1Database;
  ASSETS: R2Bucket;
  ADMIN_TOKEN?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_IMAGE_MODEL?: string;
  ARXIV_QUERY?: string;
  OPENREVIEW_API_BASE?: string;
  OPENREVIEW_INVITATIONS?: string; // comma-separated invitations
};
