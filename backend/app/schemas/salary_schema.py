from pydantic import BaseModel, Field, validator
from typing import List, Optional

class PredictionRequest(BaseModel):
    country: str
    education: str
    experience: float = Field(..., ge=0, le=50, description="Years of experience (0-50)")

    @validator('education')
    def validate_education(cls, v):
        if v not in ['Undergraduate', 'Postgraduate']:
            raise ValueError('Education must be "Undergraduate" or "Postgraduate"')
        return v

class PredictionResponse(BaseModel):
    predicted_salary: float
    predicted_salary_usd: float
    currency: str

class SalaryDataPoint(BaseModel):
    category: str
    mean_salary: float

class StatisticSummary(BaseModel):
    average_salary: float
    highest_salary: float
    lowest_salary: float
    total_records: int

class CountryCount(BaseModel):
    category: str
    count: int

class ExperiencePoint(BaseModel):
    experience: int
    mean_salary: float

class EducationSalaryByCountry(BaseModel):
    country: str
    education: str
    mean_salary: float

class AnalyticsResponse(BaseModel):
    summary_stats: StatisticSummary
    mean_salary_by_country: List[SalaryDataPoint]
    mean_salary_by_experience: List[SalaryDataPoint]
    experience_salary_points: List[ExperiencePoint]
    salary_distribution: List[dict]   # for histogram
    education_salary_comparison: List[dict]
    education_salary_distribution: List[dict]
    country_distribution: List[CountryCount]
    education_salary_by_country: List[EducationSalaryByCountry]