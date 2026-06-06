import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.ml.predict_salary import safe_predict_salary
from app.ml.preprocessing import clean_experience, clean_education

# 🌟 FIX: Removed prefix="/api"
router = APIRouter(tags=["CSV Upload"])

@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    try:
        df = pd.read_csv(file.file)
        
        required = ['Country', 'EdLevel', 'YearsCodePro']
        if set(df.columns) != set(required):
            raise HTTPException(status_code=400, detail=f"CSV must contain exactly columns {required}")

        df['YearsCodePro'] = df['YearsCodePro'].apply(clean_experience)
        df['EdLevel'] = df['EdLevel'].apply(clean_education)

        predictions = []
        errors = []
        
        for idx, row in df.iterrows():
            csv_row = idx + 2
            salary, error = safe_predict_salary(row['Country'], row['EdLevel'], row['YearsCodePro'])
            if salary is None:
                predictions.append(None)
                errors.append({"row": csv_row, "country": row['Country'], "error": error})
            else:
                predictions.append(round(salary, 2))

        df['Predicted_Salary_USD'] = predictions
        
        results = df.to_dict(orient='records')
        
        return {
            "results": results,
            "errors": errors,
            "total_rows": len(df),
            "successful_predictions": len([p for p in predictions if p is not None]),
            "failed_predictions": len(errors)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))