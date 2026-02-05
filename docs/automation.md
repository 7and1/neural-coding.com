# 自动化内容（Agents A/B/C）落地说明

## 总览

- **Agent A（Fetcher）**：抓取 arXiv/OpenReview 最新论文（增量 + 去重）
- **Agent B（Summarizer）**：输出结构化 JSON：一句话总结 + 代码角度 + 生物启发 + Markdown 正文
- **Agent C（Cover）**：生成封面图 → 保存到 R2 → 文章发布

本仓库的 MVP 实现放在 `apps/api`（Worker Cron + D1 + R2）。

## 触发方式

- 生产：Cloudflare Cron（见 `apps/api/wrangler.toml` 的 `triggers.crons`）
- 本地：手动调用：
  - `POST /api/internal/ingest/tick`（需要 `ADMIN_TOKEN`）

## 数据源配置（arXiv + OpenReview）

### arXiv

- 默认 query：`cat:q-bio.NC OR cat:cs.NE`
- 可通过 Worker vars 覆盖：`ARXIV_QUERY`

### OpenReview（可选）

> OpenReview 的“最新论文”需要按 invitation/venue 配置，不同会议每年都会变化。

- 开启方式：在 Worker vars 配 `OPENREVIEW_INVITATIONS`（逗号分隔）
- API Base（可选）：`OPENREVIEW_API_BASE`（默认 `https://api.openreview.net`）

## 幂等/去重策略

- `papers` 表用 `(source, source_id)` unique 约束保证幂等 upsert
- `learn_articles.slug` 以 `<source>-<id>` 生成（如 `arxiv-2401.01234`、`openreview-xxxxx`），重复 ingest 不会重复创建

## 扩展到 Queues（Week3/Week4）

当抓取频率和论文数量上升时，建议把 B/C 从同步改为：

- Cron 只负责：抓取 + 写入 D1 + 投递消息到 Queue
- Queue consumer：做 summarization / cover，并带重试 + dead-letter
