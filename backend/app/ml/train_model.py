import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
from pathlib import Path

# =========================================================
# 📂 SAFE PATH (WORKS ANYWHERE: LOCAL / SERVER / DOCKER)
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_PATH = BASE_DIR / "dataset" / "survey_results_public.csv"
MODEL_PATH = BASE_DIR / "app" / "models" / "saved_steps.pkl"

# =========================================================
# 📥 LOAD DATA
# =========================================================
df = pd.read_csv(DATA_PATH)

# =========================================================
# 🧹 CLEAN DATA
# =========================================================
df = df[["Country", "EdLevel", "YearsCodePro", "ConvertedComp"]]
df = df.dropna()

# Convert experience safely
df["YearsCodePro"] = pd.to_numeric(df["YearsCodePro"], errors="coerce")
df = df.dropna()

# Remove extreme outliers (important for ML stability)
df = df[(df["ConvertedComp"] > 1000) & (df["ConvertedComp"] < 500000)]

# =========================================================
# 📊 SPLIT FEATURES & TARGET
# =========================================================
X = df[["Country", "EdLevel", "YearsCodePro"]]
y = df["ConvertedComp"]

# =========================================================
# ✂️ TRAIN / TEST SPLIT
# =========================================================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# =========================================================
# 🔧 PREPROCESSOR
# =========================================================
categorical = ["Country", "EdLevel"]
numeric = ["YearsCodePro"]

preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical)
    ],
    remainder="passthrough"
)

# =========================================================
# 🌲 MODEL (OPTIMIZED RANDOM FOREST)
# =========================================================
model = Pipeline([
    ("preprocessor", preprocessor),
    ("regressor", RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        n_jobs=-1
    ))
])

# =========================================================
# 🧠 TRAIN MODEL
# =========================================================
model.fit(X_train, y_train)

# =========================================================
# 📈 EVALUATION
# =========================================================
y_pred = model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("\n================ MODEL PERFORMANCE ================")
print(f"MAE: {mae:.2f}")
print(f"R2 Score: {r2:.4f}")
print("===================================================\n")

# =========================================================
# 💾 SAVE MODEL (DEPLOYMENT READY)
# =========================================================
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

joblib.dump(model, MODEL_PATH)

print(f"Model trained successfully and saved at: {MODEL_PATH}")