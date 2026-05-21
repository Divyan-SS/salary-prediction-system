from .preprocessing import get_model, preprocess_input

# =========================================================
# 🔮 MAIN PREDICTION FUNCTION
# =========================================================
def predict_salary(country: str, education: str, experience: float) -> float:
    """
    Predict salary in USD using trained ML model.
    """

    try:
        model = get_model()

        X = preprocess_input(country, education, experience)

        prediction = model.predict(X)

        return float(prediction[0])

    except ValueError:
        raise

    except Exception as e:
        raise Exception(f"Prediction failed: {str(e)}")


# =========================================================
# 🛡️ SAFE WRAPPER (FOR API USE)
# =========================================================
def safe_predict_salary(country: str, education: str, experience: float):
    try:
        salary = predict_salary(country, education, experience)
        return salary, None

    except ValueError as ve:
        return None, str(ve)

    except Exception as e:
        return None, f"Prediction error: {str(e)}"