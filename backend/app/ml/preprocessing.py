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
# 🔥 PREPROCESS INPUT
# =========================================================
def preprocess_input(country: str, education: str, experience):
    model_data = load_model_data()

    le_country = model_data["le_country"]
    le_education = model_data["le_education"]

    if education not in ["Undergraduate", "Postgraduate"]:
        raise ValueError("Invalid education level")

    try:
        country_enc = le_country.transform([country])[0]
    except:
        raise ValueError(f"Unsupported country: {country}")

    try:
        edu_enc = le_education.transform([education])[0]
    except:
        raise ValueError("Education encoding failed")

    try:
        experience = float(experience)
    except:
        raise ValueError("Experience must be a number")

    if experience < 0 or experience > 50:
        raise ValueError("Experience must be 0–50")

    return np.array([[country_enc, edu_enc, experience]], dtype=float)