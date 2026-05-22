import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
from pathlib import Path
from app.ml.preprocessing import clean_experience, clean_education

router = APIRouter(tags=["Analytics"])

# 🌟 ROBUST PATH: Resolves path relative to this file's location
DATASET_PATH = Path(__file__).resolve().parent.parent.parent / "dataset" / "survey_results_public.csv"

_df_cache = None

def load_and_clean_data():
    global _df_cache
    if _df_cache is not None:
        return _df_cache

    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset NOT FOUND at: {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)
    df = df[["Country", "EdLevel", "YearsCodePro", "Employment", "ConvertedComp"]]
    df = df.rename({"ConvertedComp": "Salary"}, axis=1)
    df = df.dropna(subset=["Salary"])
    df = df[df["Employment"] == "Employed full-time"]
    df = df.drop("Employment", axis=1)

    country_counts = df['Country'].value_counts()
    country_map = {idx: (idx if val >= 400 else 'Other') for idx, val in country_counts.items()}
    df['Country'] = df['Country'].map(country_map)
    df = df[df['Country'] != 'Other']

    df['YearsCodePro'] = df['YearsCodePro'].apply(clean_experience)
    df['EdLevel'] = df['EdLevel'].apply(clean_education)
    df = df.dropna(subset=['EdLevel'])

    df = df[(df['Salary'] >= 10000) & (df['Salary'] <= 250000)]
    df = df[(df['YearsCodePro'] >= 0) & (df['YearsCodePro'] <= 50)]

    _df_cache = df
    return df

@router.get("/analytics")
async def get_analytics():
    try:
        df = load_and_clean_data()
        return build_analytics_payload(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def build_analytics_payload(df):
    summary_stats = {
        "average_salary": round(float(df['Salary'].mean()), 2) if not df.empty else 0,
        "highest_salary": round(float(df['Salary'].max()), 2) if not df.empty else 0,
        "lowest_salary": round(float(df['Salary'].min()), 2) if not df.empty else 0,
        "total_records": int(len(df)),
    }
    
    country_salary = df.groupby("Country")["Salary"].mean().sort_values().reset_index()
    mean_by_country = [{"category": row['Country'], "mean_salary": round(row['Salary'], 2)} for _, row in country_salary.iterrows()]

    country_distribution = [{"category": row['Country'], "count": int(row['count'])} for _, row in df.groupby("Country")["Salary"].count().reset_index(name='count').iterrows()]

    experience_points = df.groupby(df['YearsCodePro'].round().astype(int))["Salary"].mean().reset_index().rename(columns={"YearsCodePro": "experience", "Salary": "mean_salary"})
    experience_salary_points = [{"experience": int(row['experience']), "mean_salary": round(row['mean_salary'], 2)} for _, row in experience_points.iterrows()]

    hist, bins = np.histogram(df['Salary'], bins=20)
    salary_distribution = [{"bin": f"{int(bins[i])}-{int(bins[i+1])}", "count": int(hist[i])} for i in range(len(hist))]

    edu_salary = df.groupby("EdLevel")["Salary"].agg(['mean', 'count']).reset_index()
    education_salary_distribution = [{"category": row['EdLevel'], "mean_salary": round(row['mean'], 2), "count": int(row['count'])} for _, row in edu_salary.iterrows()]

    # 🌟 FIX: Generate cross-grouped matrix data required for the stacked chart component
    edu_country_salary = df.groupby(["Country", "EdLevel"])["Salary"].mean().reset_index()
    education_salary_by_country = [
        {
            "country": row['Country'],
            "education": row['EdLevel'],
            "mean_salary": round(row['Salary'], 2)
        }
        for _, row in edu_country_salary.iterrows()
    ]

    return {
        "summary_stats": summary_stats,
        "mean_salary_by_country": mean_by_country,
        "experience_salary_points": experience_salary_points,
        "salary_distribution": salary_distribution,
        "education_salary_distribution": education_salary_distribution,
        "country_distribution": country_distribution,
        "education_salary_by_country": education_salary_by_country # Added missing payload key
    }

class FilterRequest(BaseModel):
    countries: List[str]

@router.post("/analytics/filter")
async def get_filtered_analytics(payload: FilterRequest):
    df = load_and_clean_data()
    if payload.countries:
        df = df[df['Country'].isin(payload.countries)]
    return build_analytics_payload(df)