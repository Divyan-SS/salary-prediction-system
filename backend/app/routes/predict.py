from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict
import logging
import pandas as pd
import io

# 🌟 FIX: Absolute imports based on Root Directory = 'backend'
from app.schemas.salary_schema import (
    PredictionRequest, 
    PredictionResponse, 
    ConvertedSalaryResponse
)

from app.ml.predict_salary import predict_salary
from app.ml.preprocessing import clean_education # Added new normalization
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

        return PredictionResponse(
            predicted_salary=round(float(converted_salary), 2),
            predicted_salary_usd=round(float(salary_usd), 2),
            currency=target_currency
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal prediction engine error")

# =========================================================
# 📤 BATCH CSV UPLOAD
# =========================================================
@router.post("/upload-csv")
async def upload_csv_endpoint(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        results = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Normalize Education
                clean_edu = clean_education(row['EdLevel'])
                if clean_edu is None:
                    raise ValueError("Invalid education level")

                # Perform Prediction
                salary_usd = predict_salary(
                    country=row['Country'],
                    education=clean_edu,
                    experience=row['YearsCodePro']
                )

                results.append({
                    "Country": row['Country'],
                    "EdLevel": clean_edu,
                    "YearsCodePro": row['YearsCodePro'],
                    "PredictedSalary": round(float(salary_usd), 2)
                })
            except Exception as e:
                errors.append({
                    "row": index + 2, # +2 to account for 0-index and header
                    "country": row['Country'],
                    "error": str(e)
                })
        
        return {
            "results": results,
            "errors": errors,
            "successful_predictions": len(results),
            "total_rows": len(df)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
# 🌍 CURRENCIES
# =========================================================
@router.get("/currencies", response_model=Dict[str, str])
async def get_currencies():
    return get_supported_currencies()