FROM python:3.10-slim

WORKDIR /app

# Upgrade pip and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the core app and datasets over
COPY ./app ./app
COPY ./dataset ./dataset

# Render sets a dynamic $PORT environment variable (defaults to 10000)
EXPOSE 10000

# Using string format for CMD lets shell expansion pick up Render's $PORT variable
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}