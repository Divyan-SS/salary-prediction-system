import pandas as pd
from .preprocessing import get_model, preprocess_input


def predict_salary(country: str, education: str, experience: float) -> float:
    """
    Predict salary in USD using trained ML model.
    """

    try:
        # Load trained model (must be Render-safe inside get_model)
        model = get_model()

        # Preprocess input
        X_array = preprocess_input(country, education, experience)

        # Convert to DataFrame if needed
        if hasattr(model, "feature_names_in_"):
            X = pd.DataFrame(X_array, columns=model.feature_names_in_)
        else:
            X = X_array

        # Predict
        salary = model.predict(X)[0]

        return float(salary)

    except ValueError as ve:
        raise ve

    except Exception as e:
        raise Exception(f"Prediction failed: {str(e)}")


def safe_predict_salary(country: str, education: str, experience: float):
    """
    Safe API wrapper.
    """

    try:
        salary = predict_salary(country, education, experience)
        return salary, None

    except ValueError as ve:
        return None, str(ve)

    except Exception as e:
        return None, f"Prediction error: {str(e)}"