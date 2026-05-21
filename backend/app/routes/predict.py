from fastapi import APIRouter, HTTPException
from typing import Dict
from app.schemas.salary_schema import PredictionRequest, PredictionResponse
from app.ml.predict_salary import predict_salary
from app.services.currency_service import convert_currency, get_country_currency, get_supported_currencies
from app.schemas.currency_schema import ConvertedSalaryResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Prediction"])

@router.post("/predict", response_model=PredictionResponse)
async def predict_salary_endpoint(request: PredictionRequest):
    return await predict(request)

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
        raise HTTPException(status_code=500, detail=f"Currency conversion error: {str(e)}")

@router.get("/currencies", response_model=Dict[str, str])
async def get_currencies():
    return get_supported_currencies()

async def predict(request: PredictionRequest):
    try:
        logger.info(f"Prediction request: country={request.country}, education={request.education}, experience={request.experience}")
        salary_usd = predict_salary(
            country=request.country,
            education=request.education,
            experience=request.experience
        )
        
        target_currency = get_country_currency(request.country)
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
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")