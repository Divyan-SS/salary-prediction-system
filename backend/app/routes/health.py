from fastapi import APIRouter

# 🌟 FIX: Removed prefix="/api"
router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "Salary Prediction API is running"
    }