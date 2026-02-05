FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY neural-code-transpiler/app.py /app/app.py

EXPOSE 8503
CMD ["streamlit", "run", "app.py", "--server.address=0.0.0.0", "--server.port=8503", "--server.headless=true"]
