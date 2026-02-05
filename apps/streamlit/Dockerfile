FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY api.py /app/api.py
COPY streamlit_app.py /app/streamlit_app.py
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8000 8501

CMD ["/app/start.sh"]

