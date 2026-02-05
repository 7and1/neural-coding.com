#!/usr/bin/env bash
set -euo pipefail

# Run compute API + UI in one container. For higher scale, split into two containers.
uvicorn api:app --host 0.0.0.0 --port 8000 &

exec streamlit run streamlit_app.py \
  --server.address 0.0.0.0 \
  --server.port 8501 \
  --server.headless true \
  --browser.gatherUsageStats false

