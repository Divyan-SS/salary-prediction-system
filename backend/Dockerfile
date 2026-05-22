FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all repository components over cleanly
COPY . .

EXPOSE 10000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}