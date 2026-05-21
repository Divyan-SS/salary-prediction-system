from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import predict, upload, analytics, health

app = FastAPI(
    title="Salary Prediction API",
    version="1.0.0"
)

# =========================================================
# 🌐 CORS CONFIG (IMPORTANT FOR VERCEL + RENDER)
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://salary-prediction-system.vercel.app"  
      ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# 🚀 ROUTES
# =========================================================
app.include_router(predict.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(health.router, prefix="/api")


# =========================================================
# 🏠 ROOT ENDPOINT
# =========================================================
@app.get("/")
def root():
    return {
        "message": "Salary Prediction API is running"
    }


# =========================================================
# ❤️ HEALTH CHECK (IMPORTANT FOR RENDER)
# =========================================================
@app.get("/healthz")
def health_check():
    return {"status": "ok"}