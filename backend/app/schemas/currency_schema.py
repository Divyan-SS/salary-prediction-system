from pydantic import BaseModel
from typing import Dict

class CurrencyRates(BaseModel):
    rates: Dict[str, float]
    base: str

class ConvertedSalaryResponse(BaseModel):
    original_salary_usd: float
    converted_salary: float
    original_currency: str
    target_currency: str