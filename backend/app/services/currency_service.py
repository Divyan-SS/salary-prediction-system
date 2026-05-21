import httpx
from typing import Dict

# In a real application, you'd want to use an actual API key and handle it securely
# For demonstration, we'll use a placeholder and mock data if the API fails.
EXCHANGE_RATE_API_URL = "https://api.exchangerate-api.com/v4/latest/USD"

# Hardcoded mapping of countries to their primary currency codes
# This list is not exhaustive and should be expanded as needed.
COUNTRY_CURRENCY_MAP = {
    "United States": "USD",
    "India": "INR",
    "United Kingdom": "GBP",
    "Germany": "EUR",
    "Canada": "CAD",
    "Brazil": "BRL",
    "France": "EUR",
    "Spain": "EUR",
    "Australia": "AUD",
    "Netherlands": "EUR",
    "Poland": "PLN",
    "Italy": "EUR",
    "Russian Federation": "RUB",
    "Sweden": "SEK",
    # Add more countries and their currencies as needed
}

# Fallback rates in case the API call fails or is rate-limited
FALLBACK_RATES: Dict[str, float] = {
    "USD": 1.0,
    "INR": 83.0,  # Example rate
    "GBP": 0.8,   # Example rate
    "EUR": 0.9,   # Example rate
    "CAD": 1.35,  # Example rate
    "BRL": 5.0,   # Example rate
    "AUD": 1.5,   # Example rate
    "PLN": 4.0,   # Example rate
    "RUB": 90.0,  # Example rate
    "SEK": 10.5,  # Example rate
    "JPY": 135.0, # Example rate
    "CNY": 7.1,   # Example rate
    "AED": 3.67,  # Example rate
}

CURRENCY_NAME_MAP: Dict[str, str] = {
    "USD": "United States Dollar",
    "INR": "Indian Rupee",
    "GBP": "British Pound",
    "EUR": "Euro",
    "CAD": "Canadian Dollar",
    "BRL": "Brazilian Real",
    "AUD": "Australian Dollar",
    "PLN": "Polish Zloty",
    "RUB": "Russian Ruble",
    "SEK": "Swedish Krona",
    "JPY": "Japanese Yen",
    "CNY": "Chinese Yuan",
    "AED": "UAE Dirham",
}

async def get_exchange_rates() -> Dict[str, float]:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(EXCHANGE_RATE_API_URL, timeout=5)
            response.raise_for_status()  # Raise an exception for bad status codes
            data = response.json()
            return data.get("rates", {})
    except httpx.RequestError as e:
        print(f"HTTPX RequestError: {e}. Using fallback rates.")
        return FALLBACK_RATES
    except Exception as e:
        print(f"An unexpected error occurred: {e}. Using fallback rates.")
        return FALLBACK_RATES

async def convert_currency(amount_usd: float, target_currency: str) -> float:
    if target_currency == "USD":
        return amount_usd

    rates = await get_exchange_rates()
    usd_to_target_rate = rates.get(target_currency, FALLBACK_RATES.get(target_currency))

    if usd_to_target_rate is None:
        # Fallback to USD if target currency not found even in fallbacks
        print(f"Warning: Could not find exchange rate for {target_currency}. Returning USD value.")
        return amount_usd

    return amount_usd * usd_to_target_rate

def get_country_currency(country: str) -> str:
    return COUNTRY_CURRENCY_MAP.get(country, "USD") # Default to USD if not found

def get_supported_currencies() -> Dict[str, str]:
    # Returns a mapping of currency code to a friendly currency name.
    supported_codes = set(FALLBACK_RATES.keys()) | set(COUNTRY_CURRENCY_MAP.values())
    return {code: CURRENCY_NAME_MAP.get(code, code) for code in supported_codes}


