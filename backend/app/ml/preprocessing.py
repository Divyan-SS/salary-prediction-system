import pickle
import numpy as np
from pathlib import Path

# =========================================================
# 📦 SAFE MODEL PATH (LOCAL + RENDER + DOCKER SAFE)
# =========================================================

# Go to backend/app/models
BASE_DIR = Path(__file__).resolve().parent.parent
_MODEL_PATH = BASE_DIR / "models" / "saved_steps.pkl"

_model_data = None


# =========================================================
# ⚡ LOAD MODEL (CACHED - LOAD ONCE ONLY)
# =========================================================
def load_model_data():
    global _model_data

    if _model_data is None:
        try:
            if not _MODEL_PATH.exists():
                raise FileNotFoundError(
                    f"❌ Model file not found at: {_MODEL_PATH}"
                )

            with open(_MODEL_PATH, "rb") as f:
                _model_data = pickle.load(f)

        except Exception as e:
            raise RuntimeError(f"Failed to load model: {str(e)}")

    return _model_data


# =========================================================
# 🤖 GET MODEL + ENCODERS
# =========================================================
def get_model():
    return load_model_data()["model"]


def get_country_encoder():
    return load_model_data()["le_country"]


def get_education_encoder():
    return load_model_data()["le_education"]


# =========================================================
# 🧹 EXPERIENCE CLEANING
# =========================================================
def clean_experience(x):
    if x is None:
        return None

    if isinstance(x, float) and np.isnan(x):
        return None

    if isinstance(x, str):
        x = x.strip()

        if x == "":
            return None
        if x == "More than 50 years":
            return 50.0
        if x == "Less than 1 year":
            return 0.5

        try:
            return float(x)
        except:
            return None

    try:
        value = float(x)
    except:
        return None

    if value < 0 or value > 50:
        return None

    return value


# =========================================================
# 🎓 EDUCATION CLEANING
# =========================================================
def clean_education(x):
    if isinstance(x, str):
        x = x.strip()

        if "Bachelor’s degree" in x:
            return "Undergraduate"

        if (
            "Master’s degree" in x
            or "Professional degree"
            or "Other doctoral"
        ):
            return "Postgraduate"

    return None


# =========================================================
# 🔥 MAIN PREPROCESSING FUNCTION
# =========================================================
def preprocess_input(country: str, education: str, experience):
    """
    Converts raw input → model-ready numpy array
    Shape: (1, 3)
    """

    model_data = load_model_data()
    le_country = model_data["le_country"]
    le_education = model_data["le_education"]

    # -------------------------
    # Validate education
    # -------------------------
    if education not in ["Undergraduate", "Postgraduate"]:
        raise ValueError(
            f"Invalid education: {education}. Must be Undergraduate or Postgraduate."
        )

    # -------------------------
    # Encode country
    # -------------------------
    try:
        country_enc = le_country.transform([country])[0]
    except ValueError:
        raise ValueError(
            f"Country '{country}' not supported. "
            f"Supported: {list(le_country.classes_)}"
        )

    # -------------------------
    # Encode education
    # -------------------------
    try:
        edu_enc = le_education.transform([education])[0]
    except Exception:
        raise ValueError("Education encoding failed")

    # -------------------------
    # Validate experience
    # -------------------------
    if experience is None:
        raise ValueError("Experience cannot be empty")

    try:
        experience = float(experience)
    except:
        raise ValueError("Experience must be a number")

    if experience < 0 or experience > 50:
        raise ValueError("Experience must be between 0 and 50 years")

    # -------------------------
    # FINAL MODEL INPUT
    # -------------------------
    return np.array([[country_enc, edu_enc, experience]], dtype=float)