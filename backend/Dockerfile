FROM python:3.10-slim

WORKDIR /app

# Copy dependency specifications and install cleanly
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all repository component layers over cleanly
COPY . .

# Train the ML model at build time to align scikit-learn versions
RUN python -m app.ml.train_model

EXPOSE 10000


# 🌟 STANDARD DOCKER ENTRYPOINT: 
# Target the module directly using string lists to avoid shell path wrapping errors
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]