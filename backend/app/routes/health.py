from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["Health"])

@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Salary Prediction API is running"}