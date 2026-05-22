from fastapi import APIRouter, HTTPException
from typing import Dict
import logging

from app.schemas.salary_schema import PredictionRequest, PredictionResponse
from app.schemas.currency_schema import ConvertedSalaryResponse

from app.ml.predict_salary import predict_salary
from app.services.currency_service import (
    convert_currency,
    get_country_currency,
    get_supported_currencies
)

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
        # Sanitization: Clean quotes and whitespace before hitting the ML pipeline
        clean_edu = request.education.replace("’", "'").strip()
        clean_country = request.country.strip()

        logger.info(
            f"Prediction request: country={clean_country}, "
            f"education={clean_edu}, experience={request.experience}"
        )

        salary_usd = predict_salary(
            country=clean_country,
            education=clean_edu,
            experience=request.experience
        )

        target_currency = get_country_currency(clean_country)
        converted_salary = await convert_currency(salary_usd, target_currency)

        return PredictionResponse(
            predicted_salary=round(converted_salary, 2),
            predicted_salary_usd=round(salary_usd, 2),
            currency=target_currency
        )

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# 💱 CONVERT SALARY
# =========================================================
@router.post("/convert-salary", response_model=ConvertedSalaryResponse)
async def convert_salary_endpoint(original_salary_usd: float, target_currency: str):
    try:
        converted_salary = await convert_currency(original_salary_usd, target_currency)

        return ConvertedSalaryResponse(
            original_salary_usd=original_salary_usd,
            converted_salary=round(converted_salary, 2),
            original_currency="USD",
            target_currency=target_currency
        )

    except Exception as e:
        logger.error(f"Currency conversion failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# 🌍 CURRENCIES
# =========================================================
@router.get("/currencies", response_model=Dict[str, str])
async def get_currencies():
    return get_supported_currencies()