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
def load_model_data():
    global _model_data
    if _model_data is None:
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(f"Model not found: {_MODEL_PATH}")
        with open(_MODEL_PATH, "rb") as f:
            _model_data = pickle.load(f)
    return _model_data

# =========================================================
# 🔥 SMART EDUCATION NORMALIZATION (IMPROVED)
# =========================================================
def clean_education(edu_str):
    if not isinstance(edu_str, str):
        return None
    
    # Normalize encoding and characters
    text = edu_str.encode('ascii', 'ignore').decode('utf-8') if 'â' in edu_str else edu_str
    text = text.replace('’', "'").replace('â€™', "'").lower().strip()
    
    # Patterns
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
    model_data = load_model_data()
    le_country = model_data["le_country"]
    le_education = model_data["le_education"]

    norm_education = clean_education(education)
    
    # If None, the row is invalid
    if norm_education is None:
        raise ValueError("Invalid education level")

    try:
        country_enc = le_country.transform([country])[0]
    except:
        raise ValueError(f"Unsupported country: {country}")

    try:
        edu_enc = le_education.transform([norm_education])[0]
    except Exception as e:
        raise ValueError(f"Education encoding failed: {str(e)}")

    try:
        experience = float(experience)
    except:
        raise ValueError("Experience must be a number")

    if experience < 0 or experience > 50:
        raise ValueError("Experience must be 0–50")

    return np.array([[country_enc, edu_enc, experience]], dtype=float)

# =========================================================
# 🧹 BULK CSV UPLOAD CLEANERS
# =========================================================
def clean_experience(x):
    if x == 'More than 50 years': return 50
    if x == 'Less than 1 year': return 0.5
    try: return float(x)
    except: return 0.0