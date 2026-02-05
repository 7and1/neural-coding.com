# 4 周路线图（可交付）

## Week 1：环境与骨架（可上线）

- Pages：`/` + `/playground` + `/api`（静态文档页）上线
- Worker：`/api/v1/health`、`/learn` SSR 骨架、D1 schema 初始化
- VPS：Docker + Nginx + 1 个 Streamlit Demo 服务可访问
- 监控：Cloudflare Logs/Analytics + Worker tail + Origin 基础监控

## Week 2：工具矩阵（4 工具可用）

- LIF-Explorer：可调参数、仿真、输出 spike train
- Synaptic-Weight Visualizer：Hebbian 更新可视化、导出图
- Neural-Code-Transpiler：Python→Brian2/Norse（先做 subset）
- Neuro-Data-Formatter：CSV→NWB（模板化字段映射 + 校验）

## Week 3：自动化内容（Agents 上线）

- Agent A：arXiv/OpenReview 抓取（增量、去重、幂等）
- Agent B：三段式生成（1 句话、代码角度、生物启发）+ 结构化 JSON
- Agent C：封面生成 + R2 存储 + learn 发布
- /learn：列表、详情、标签、搜索（最小可用）

## Week 4：优化与产品化

- 可靠性：队列化、重试、死信、后台任务观测
- SEO：结构化数据、站点地图、RSS
- 成本：缓存命中率、模型分层、批处理
- 体验：Landing 动画优化、Playground 聚合、文档完善
