from fastapi import APIRouter, HTTPException
from typing import Dict
import logging
import uuid
from datetime import datetime, timezone

# 🌟 FIX: Absolute imports based on Root Directory = 'backend'
from app.schemas.salary_schema import (
    PredictionRequest, 
    PredictionResponse, 
    ConvertedSalaryResponse,
    BulkConversionRequest,
    BulkConversionResponse
)

from app.ml.predict_salary import predict_salary
from app.ml.preprocessing import clean_education # Added new normalization
from app.services.currency_service import (
    convert_currency,
    get_country_currency,
    get_supported_currencies
)
from app.services.state_store import state_store

# =========================================================
# LOGGING
# =========================================================
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Prediction"])

# =========================================================
# 🔮 PREDICTION ENDPOINT
# =========================================================
@router.post("/predict", response_model=PredictionResponse)
async def predict_salary_endpoint(request: PredictionRequest):
    try:
        # Use new smart normalization
        clean_edu = clean_education(request.education)
        if clean_edu is None:
            raise ValueError("Invalid education level provided")
            
        clean_country = request.country.strip()

        logger.info(f"Prediction: {clean_country}, {clean_edu}, {request.experience}")

        salary_usd = predict_salary(
            country=clean_country,
            education=clean_edu,
            experience=request.experience
        )

        target_currency = get_country_currency(clean_country)
        converted_salary = await convert_currency(salary_usd, target_currency)

        # Generate unique prediction_id
        prediction_id = str(uuid.uuid4())
        
        # Save state to state_store
        payload = {
            "prediction_id": prediction_id,
            "user_email": request.user_email.strip() if request.user_email else None,
            "user_name": request.user_name.strip() if request.user_name else None,
            "created_at": datetime.now(timezone.utc).timestamp(),
            "status": "pending",
            "prediction_data": {
                "country": clean_country,
                "education": clean_edu,
                "experience": request.experience,
                "predicted_salary_usd": round(float(salary_usd), 2)
            }
        }
        
        # 5-minute decision window (300 seconds TTL)
        state_store.set(prediction_id, payload, 300)

        return PredictionResponse(
            predicted_salary=round(float(converted_salary), 2),
            predicted_salary_usd=round(float(salary_usd), 2),
            currency=target_currency,
            prediction_id=prediction_id
        )


    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal prediction engine error")



# =========================================================
# 💱 CONVERT SALARY
# =========================================================
@router.post("/convert-salary", response_model=ConvertedSalaryResponse)
async def convert_salary_endpoint(original_salary_usd: float, target_currency: str):
    try:
        converted_salary = await convert_currency(original_salary_usd, target_currency)
        return ConvertedSalaryResponse(
            original_salary_usd=float(original_salary_usd),
            converted_salary=round(float(converted_salary), 2),
            original_currency="USD",
            target_currency=target_currency
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# 💱 CONVERT SALARIES BULK
# =========================================================
@router.post("/convert-salaries-bulk", response_model=BulkConversionResponse)
async def convert_salaries_bulk_endpoint(request: BulkConversionRequest):
    try:
        converted = []
        for usd in request.salaries_usd:
            if usd is None:
                converted.append(0.0) # Placeholder for error rows
            else:
                val = await convert_currency(usd, request.target_currency)
                converted.append(round(float(val), 2))
                
        return BulkConversionResponse(
            converted_salaries=converted,
            target_currency=request.target_currency
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# 🌍 CURRENCIES
# =========================================================
@router.get("/currencies", response_model=Dict[str, str])
async def get_currencies():
    return get_supported_currencies()