import pandas as pd
from .preprocessing import get_model, preprocess_input


def predict_salary(country: str, education: str, experience: float) -> float:
    """
    Predict salary in USD using trained ML model.

    Args:
        country (str): Country name
        education (str): Education level
        experience (float): Years of experience

    Returns:
        float: Predicted salary in USD

    Raises:
        ValueError: If input values are invalid
        Exception: For any prediction/model errors
    """

    try:
        # Load trained model (cached inside get_model)
        model = get_model()

        # Preprocess input for model
        X_array = preprocess_input(country, education, experience)

        # Convert to DataFrame if model expects feature names
        if hasattr(model, "feature_names_in_"):
            X = pd.DataFrame(X_array, columns=model.feature_names_in_)
        else:
            X = X_array

        # Predict salary
        salary = model.predict(X)[0]

        return float(salary)

    except ValueError as ve:
        # Input validation errors (bad country/education/etc.)
        raise ve

    except Exception as e:
        # Unexpected runtime errors
        raise Exception(f"Prediction failed: {str(e)}")


def safe_predict_salary(country: str, education: str, experience: float):
    """
    Safe wrapper for prediction API usage.

    Returns:
        tuple: (salary, error_message)
        - salary (float or None)
        - error_message (str or None)
    """

    try:
        salary = predict_salary(country, education, experience)
        return salary, None

    except ValueError as ve:
        return None, str(ve)

    except Exception as e:
        return None, f"Prediction error: {str(e)}"