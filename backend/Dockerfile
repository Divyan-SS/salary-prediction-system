FROM python:3.10-slim

WORKDIR /app

# Copy dependency configuration straight from the backend context layer
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all repository components over cleanly
COPY . .

EXPOSE 10000

# 🌟 CRITICAL PATH CORRECTION: 
# Move execution context inside the backend directory block where app/ leaves,
# then spin up the ASGI app.main controller sequence cleanly.
CMD ["sh", "-c", "cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]