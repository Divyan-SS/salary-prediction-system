import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
from pathlib import Path
from fastapi import Body


# Import cleaning functions from ml.preprocessing
from app.ml.preprocessing import clean_experience, clean_education

router = APIRouter(prefix="/api", tags=["Analytics"])

# Path to the dataset – adjust if needed
DATASET_PATH = Path(__file__).parent.parent.parent / "dataset" / "survey_results_public.csv"

# Cache the cleaned DataFrame
_df_cache = None

def load_and_clean_data():
    """
    Loads the survey dataset, applies the same cleaning steps as the original notebook,
    and returns a cached DataFrame.
    """
    global _df_cache
    if _df_cache is not None:
        return _df_cache

    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)

    # Keep only relevant columns
    df = df[["Country", "EdLevel", "YearsCodePro", "Employment", "ConvertedComp"]]
    df = df.rename({"ConvertedComp": "Salary"}, axis=1)
    df = df.dropna(subset=["Salary"])
    df = df[df["Employment"] == "Employed full-time"]
    df = df.drop("Employment", axis=1)

    # Group countries with fewer than 400 responses into "Other"
    def shorten_categories(categories, cutoff):
        categorical_map = {}
        for i in range(len(categories)):
            if categories.values[i] >= cutoff:
                categorical_map[categories.index[i]] = categories.index[i]
            else:
                categorical_map[categories.index[i]] = 'Other'
        return categorical_map

    country_counts = df['Country'].value_counts()
    country_map = shorten_categories(country_counts, 400)
    df['Country'] = df['Country'].map(country_map)
    df = df[df['Country'] != 'Other']

    # Clean experience and education
    df['YearsCodePro'] = df['YearsCodePro'].apply(clean_experience)
    df['EdLevel'] = df['EdLevel'].apply(clean_education)
    df = df.dropna(subset=['EdLevel'])

    # Filter salary and experience ranges
    df = df[(df['Salary'] >= 10000) & (df['Salary'] <= 250000)]
    df = df[(df['YearsCodePro'] >= 0) & (df['YearsCodePro'] <= 50)]

    _df_cache = df
    return df

@router.get("/analytics")
async def get_analytics():
    """
    Returns analytics for ALL countries (no filter).
    """
    try:
        df = load_and_clean_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return build_analytics_payload(df)


def build_analytics_payload(df):
    summary_stats = {
        "average_salary": round(df['Salary'].mean(), 2) if not df.empty else 0,
        "highest_salary": round(df['Salary'].max(), 2) if not df.empty else 0,
        "lowest_salary": round(df['Salary'].min(), 2) if not df.empty else 0,
        "total_records": int(len(df)),
    }

    country_salary = df.groupby("Country")["Salary"].mean().sort_values().reset_index()
    mean_by_country = [
        {"category": row['Country'], "mean_salary": round(row['Salary'], 2)}
        for _, row in country_salary.iterrows()
    ]

    country_distribution = [
        {"category": row['Country'], "count": int(row['count'])}
        for _, row in df.groupby("Country")["Salary"].count().reset_index(name='count').sort_values('count', ascending=False).iterrows()
    ]

    experience_points = (
        df.groupby(df['YearsCodePro'].round().astype(int))["Salary"]
          .mean()
          .reset_index()
          .sort_values('YearsCodePro')
          .rename(columns={"YearsCodePro": "experience", "Salary": "mean_salary"})
    )
    experience_salary_points = [
        {"experience": int(row['experience']), "mean_salary": round(row['mean_salary'], 2)}
        for _, row in experience_points.iterrows()
    ]

    exp_bins = range(0, 51, 5)
    df['ExpGroup'] = pd.cut(df['YearsCodePro'], bins=exp_bins, right=False)
    exp_salary = df.groupby("ExpGroup")["Salary"].mean().reset_index()
    mean_by_experience = []
    for interval, row in zip(exp_salary['ExpGroup'], exp_salary.iterrows()):
        if pd.isna(interval):
            continue
        left = int(interval.left)
        right = int(interval.right)
        mean_by_experience.append({
            "category": f"{left}-{right}",
            "mean_salary": round(row[1]['Salary'], 2)
        })

    hist, bins = np.histogram(df['Salary'], bins=20)
    salary_distribution = [
        {"bin": f"{int(bins[i])}-{int(bins[i+1])}", "count": int(hist[i])}
        for i in range(len(hist))
    ]

    edu_salary = df.groupby("EdLevel")["Salary"].agg(['mean', 'median', 'std', 'count']).reset_index()
    education_salary_comparison = edu_salary.to_dict(orient='records')
    education_salary_distribution = [
        {"category": row['EdLevel'], "mean_salary": round(row['mean'], 2), "count": int(row['count'])}
        for _, row in edu_salary.iterrows()
    ]

    edu_country_salary = (
        df.groupby(["Country", "EdLevel"])["Salary"]
          .mean()
          .reset_index()
          .rename(columns={"Salary": "mean_salary"})
    )
    education_salary_by_country = [
        {"country": row['Country'], "education": row['EdLevel'], "mean_salary": round(row['mean_salary'], 2)}
        for _, row in edu_country_salary.iterrows()
    ]

    return {
        "summary_stats": summary_stats,
        "mean_salary_by_country": mean_by_country,
        "mean_salary_by_experience": mean_by_experience,
        "experience_salary_points": experience_salary_points,
        "salary_distribution": salary_distribution,
        "education_salary_comparison": education_salary_comparison,
        "education_salary_distribution": education_salary_distribution,
        "country_distribution": country_distribution,
        "education_salary_by_country": education_salary_by_country,
    }

class FilterRequest(BaseModel):
    countries: List[str]

@router.post("/analytics/filter")
async def get_filtered_analytics(payload: FilterRequest):
    """
    Returns analytics filtered by a list of selected countries.
    """
    try:
        df = load_and_clean_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    selected = payload.countries
    if selected:
        df = df[df['Country'].isin(selected)]

    if df.empty:
        return {
            "summary_stats": {"average_salary": 0, "highest_salary": 0, "lowest_salary": 0, "total_records": 0},
            "mean_salary_by_country": [],
            "mean_salary_by_experience": [],
            "experience_salary_points": [],
            "salary_distribution": [],
            "education_salary_comparison": [],
            "education_salary_distribution": [],
            "country_distribution": [],
            "education_salary_by_country": [],
        }

    return build_analytics_payload(df)