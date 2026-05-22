import pickle
import numpy as np
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
# 🤖 GETTERS
# =========================================================
def get_model():
    return load_model_data()["model"]


def get_country_encoder():
    return load_model_data()["le_country"]


def get_education_encoder():
    return load_model_data()["le_education"]


# =========================================================
# 🔥 PREPROCESS INPUT (FIXED NORMALIZATION)
# =========================================================
def preprocess_input(country: str, education: str, experience):
    model_data = load_model_data()

    le_country = model_data["le_country"]
    le_education = model_data["le_education"]

    # Normalize education input
    norm_education = clean_education(education)
    
    # Validation
    if norm_education not in ["Undergraduate", "Postgraduate"]:
        raise ValueError(f"Invalid education level: {education}")

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
# 🧹 BULK CSV UPLOAD CLEANING CLEANERS
# =========================================================
def clean_experience(x):
    if x == 'More than 50 years':
        return 50
    if x == 'Less than 1 year':
        return 0.5
    try:
        return float(x)
    except:
        return 0.0

def clean_education(x):
    if not isinstance(x, str):
        return "Undergraduate"
    if "Bachelor's degree" in x or "Professional degree" in x:
        return "Undergraduate"
    if "Master's degree" in x or "Other doctoral" in x:
        return "Postgraduate"
    return x if x in ["Undergraduate", "Postgraduate"] else "Undergraduate"