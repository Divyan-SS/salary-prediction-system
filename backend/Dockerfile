FROM python:3.10-slim

WORKDIR /app

# Copy dependency configuration directly from your root execution path
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy everything directly into /app (which is your backend folder's content)
COPY . .

EXPOSE 10000

# 🌟 THE FINAL FIX: 
# Run uvicorn directly on the root workspace since app/main.py is right here.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]