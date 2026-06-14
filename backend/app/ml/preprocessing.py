import re
from pathlib import Path
import joblib
import pandas as pd

# =========================================================
# 📦 MODEL PATH (RENDER SAFE)
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent
_MODEL_PATH = BASE_DIR / "models" / "saved_best_model.pkl"

_model_data = None

# Clean human-readable values for external display and API schemas
CLEAN_CATEGORIES = {
    "bachelor": "Bachelor's degree",
    "master": "Master's degree",
    "post_grad": "Postgrad / Doctoral",
    "less_than_bachelor": "Less than a Bachelor's"
}

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
    return load_model_data()["model"]

def get_country_encoder():
    return load_model_data()["le_country"]

def get_education_encoder():
    return load_model_data()["le_education"]

# =========================================================
# 🔥 SMART EDUCATION NORMALIZATION
# =========================================================
def clean_education(edu_str):
    if not isinstance(edu_str, str):
        return CLEAN_CATEGORIES["less_than_bachelor"]
    
    text = edu_str.lower().strip()
    
    # Map to the 4 clean categories
    if 'bachelor' in text or 'undergrad' in text:
        return CLEAN_CATEGORIES["bachelor"]
    elif 'master' in text:
        return CLEAN_CATEGORIES["master"]
    elif 'doctoral' in text or 'phd' in text or 'professional degree' in text or 'doctorate' in text or 'postgrad' in text or 'post grad' in text:
        return CLEAN_CATEGORIES["post_grad"]
    else:
        return CLEAN_CATEGORIES["less_than_bachelor"]

# =========================================================
# ⚡ PREPROCESS INPUT
# =========================================================
def preprocess_input(country: str, education: str, experience):
    model_data = load_model_data()
    le_country = model_data["le_country"]
    le_education = model_data["le_education"]
    
    # Clean and validate inputs
    country_cleaned = country.strip()
    norm_education = clean_education(education)
    
    # Map the clean categories to the exact internal classes (handling encoding mismatch)
    classes = le_education.classes_
    bachelor_class = [c for c in classes if 'Bachelor' in c and 'Less' not in c][0]
    master_class = [c for c in classes if 'Master' in c][0]
    post_grad_class = [c for c in classes if 'Post' in c or 'grad' in c][0]
    less_class = [c for c in classes if 'Less' in c][0]
    
    internal_map = {
        CLEAN_CATEGORIES["bachelor"]: bachelor_class,
        CLEAN_CATEGORIES["master"]: master_class,
        CLEAN_CATEGORIES["post_grad"]: post_grad_class,
        CLEAN_CATEGORIES["less_than_bachelor"]: less_class
    }
    
    mapped_education = internal_map.get(norm_education, less_class)

    if country_cleaned not in le_country.classes_:
        raise ValueError(f"Unsupported country: {country_cleaned}")

    try:
        experience = float(experience)
    except:
        raise ValueError("Experience must be a number")

    if experience < 0 or experience > 50:
        raise ValueError("Experience must be 0–50")

    # Encode using LabelEncoders
    country_encoded = le_country.transform([country_cleaned])[0]
    education_encoded = le_education.transform([mapped_education])[0]

    # Return DataFrame with proper column headers for RandomForestRegressor
    return pd.DataFrame(
        [[country_encoded, education_encoded, experience]], 
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