# =========================================================
# 🌐 CORS CONFIG (FRONTEND SUPPORT)
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://salary-prediction-system-mu.vercel.app"
    ],
    # 🌟 THIS REGEX AUTOMATICALLY TRUSTS ALL VERCEL PREVIEW AND MAIN URLS
    allow_origin_regex=r"https://.*.vercel.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)