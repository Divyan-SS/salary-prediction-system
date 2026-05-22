from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict, upload, analytics, health
import traceback

# =========================================================
# 🚀 APP INIT
# =========================================================
app = FastAPI(
    title="Salary Prediction API",
    version="1.0.0"
)

# =========================================================
# 🌐 CORS CONFIG
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://salary-prediction-system-mu.vercel.app"
    ],
    allow_origin_regex=r"https://.*.vercel.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# 🔌 ROUTES (Mounting all routers under /api)
# =========================================================
# The prefix='/api' here will turn router.get('/analytics') 
# into /api/analytics
app.include_router(predict.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(health.router, prefix="/api")

# =========================================================
# 🏠 ROOT ENDPOINTS
# =========================================================
@app.get("/")
def root():
    return {"message": "Salary Prediction API is running"}

@app.get("/healthz")
def health_check():
    return {"status": "ok"}

# =========================================================
# 🛡️ ERROR LOGGING
# =========================================================
@app.on_event("startup")
def startup_event():
    try:
        print("🚀 Server starting successfully...")
    except Exception:
        print(traceback.format_exc())