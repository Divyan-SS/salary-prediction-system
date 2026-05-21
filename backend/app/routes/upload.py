import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.ml.predict_salary import safe_predict_salary
from app.ml.preprocessing import clean_experience, clean_education

router = APIRouter(prefix="/api", tags=["CSV Upload"])

@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    try:
        try:
            df = pd.read_csv(file.file)
        except UnicodeDecodeError:
            file.file.seek(0)
            try:
                df = pd.read_csv(file.file, encoding='latin-1')
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Upload failed: Invalid CSV encoding or file could not be read. "
                        "Please ensure the file is a valid CSV and encoded as UTF-8 or Latin-1. "
                        f"Error: {str(e)}"
                    )
                )
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Upload failed: Invalid CSV or file could not be read. "
                    "Please ensure the file is a valid CSV and closed before uploading. "
                    f"Error: {str(e)}"
                )
            )

        required = ['Country', 'EdLevel', 'YearsCodePro']
        if set(df.columns) != set(required) or len(df.columns) != len(required):
            raise HTTPException(
                status_code=400,
                detail=f"Upload failed: CSV must contain only columns {required}. Found: {list(df.columns)}"
            )

        # Apply cleaning
        df['YearsCodePro'] = df['YearsCodePro'].apply(clean_experience)
        df['EdLevel'] = df['EdLevel'].apply(clean_education)

        predictions = []
        errors = []
        for idx, row in df.iterrows():
            csv_row = idx + 2
            if pd.isna(row['Country']) or pd.isna(row['EdLevel']) or pd.isna(row['YearsCodePro']):
                predictions.append("can't predict")
                missing = []
                if pd.isna(row['Country']):
                    missing.append('Country')
                if pd.isna(row['EdLevel']):
                    missing.append('EdLevel')
                if pd.isna(row['YearsCodePro']):
                    missing.append('YearsCodePro')
                error_msg = (
                    f"Row {csv_row}: can't predict because missing or invalid values for: "
                    f"{', '.join(missing)}"
                )
                if 'YearsCodePro' in missing:
                    error_msg += " limit[0-50]years. mention in correct format"
                errors.append({
                    "row": csv_row,
                    "country": None if pd.isna(row['Country']) else row['Country'],
                    "error": error_msg
                })
                continue

            salary, error = safe_predict_salary(row['Country'], row['EdLevel'], row['YearsCodePro'])
            if salary is None:
                predictions.append("can't predict")
                errors.append({
                    "row": csv_row,
                    "country": None if pd.isna(row['Country']) else row['Country'],
                    "error": error
                })
            else:
                predictions.append(round(salary, 2))

        df['Predicted_Salary_USD'] = predictions

        def sanitize_value(value):
            if pd.isna(value):
                return None
            if isinstance(value, np.generic):
                return value.item()
            return value

        results = []
        for row in df.to_dict(orient='records'):
            sanitized_row = {key: sanitize_value(value) for key, value in row.items()}
            results.append(sanitized_row)

        return {
            "results": results,
            "errors": errors,
            "total_rows": len(df),
            "successful_predictions": sum(1 for p in predictions if p != "can't predict"),
            "failed_predictions": len(errors)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed internally: {type(e).__name__}: {e}")