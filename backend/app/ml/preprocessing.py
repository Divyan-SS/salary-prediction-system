import pickle
import numpy as np
import re
from pathlib import Path

# =========================================================
# 📦 MODEL PATH (RENDER SAFE)
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent
_MODEL_PATH = BASE_DIR / "models" / "saved_steps.pkl"

_model_data = None

# =========================================================
# ⚡ LOAD MODEL ONCE
# =========================================================
import joblib
import pandas as pd

# =========================================================
# ⚡ LOAD MODEL ONCE
# =========================================================
def load_model_data():
    global _model_data
    if _model_data is None:
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(f"Model not found: {_MODEL_PATH}")
        _model_data = joblib.load(_MODEL_PATH)
    return _model_data

# =========================================================
# 🤖 GETTERS (REQUIRED FOR ARCHITECTURAL STABILITY)
# =========================================================
def get_model():
    return load_model_data()

def get_country_encoder():
    # Deprecated: returns None as pipeline manages OHE directly
    return None

def get_education_encoder():
    # Deprecated: returns None as pipeline manages OHE directly
    return None

# =========================================================
# 🔥 SMART EDUCATION NORMALIZATION
# =========================================================
def clean_education(edu_str):
    if not isinstance(edu_str, str):
        return None
    
    # Normalize broken encoding and characters
    text = edu_str.encode('ascii', 'ignore').decode('utf-8') if 'â' in edu_str else edu_str
    text = text.replace('’', "'").replace('â€™', "'").lower().strip()
    
    # Keyword Patterns
    undergrad_patterns = [r'bachelor', r'b\.sc', r'bsc', r'b\.e', r'be', r'b\.tech', r'btech', r'undergraduate']
    postgrad_patterns = [r'master', r'm\.sc', r'msc', r'm\.e', r'me', r'm\.tech', r'mtech', 
                         r'mba', r'phd', r'doctoral', r'doctorate', r'professional degree', r'postgraduate']
    
    for pattern in undergrad_patterns:
        if re.search(pattern, text):
            return "Undergraduate"
            
    for pattern in postgrad_patterns:
        if re.search(pattern, text):
            return "Postgraduate"
            
    return None

# =========================================================
# ⚡ PREPROCESS INPUT
# =========================================================
def preprocess_input(country: str, education: str, experience):
    pipeline = load_model_data()
    
    # Clean and validate inputs
    country_cleaned = country.strip()
    norm_education = clean_education(education)
    
    if norm_education not in ["Undergraduate", "Postgraduate"]:
        raise ValueError(f"Invalid education level: {education}")

    # Inspect supported categories from the pipeline preprocessor
    try:
        preprocessor = pipeline.named_steps["preprocessor"]
        ohe = preprocessor.named_transformers_["cat"]
        supported_countries = ohe.categories_[0]
    except Exception as e:
        raise ValueError(f"Model preprocessing metadata unavailable: {str(e)}")

    if country_cleaned not in supported_countries:
        raise ValueError(f"Unsupported country: {country_cleaned}")

    try:
        experience = float(experience)
    except:
        raise ValueError("Experience must be a number")

    if experience < 0 or experience > 50:
        raise ValueError("Experience must be 0–50")

    # Return DataFrame with proper column headers for ColumnTransformer
    return pd.DataFrame(
        [[country_cleaned, norm_education, experience]], 
        columns=["Country", "EdLevel", "YearsCodePro"]
    )

# =========================================================
# 🧹 BULK CSV UPLOAD CLEANERS
# =========================================================
def clean_experience(x):
    if x == 'More than 50 years': return 50
    if x == 'Less than 1 year': return 0.5
    try: return float(x)
    except: return 0.0