from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict, upload, analytics, health

app = FastAPI(title="Salary Prediction API", version="1.0")

# CORS – allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(upload.router)
app.include_router(analytics.router)
app.include_router(health.router)

@app.get("/")
def root():
    return {"message": "Welcome to Salary Prediction API"}