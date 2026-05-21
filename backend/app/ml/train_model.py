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
# 📂 SAFE PATH (LOCAL / RENDER / DOCKER SAFE)
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

# =========================================================
# 🔧 FIX: CLEAN "YearsCodePro" PROPERLY (VERY IMPORTANT)
# =========================================================
def convert_experience(x):
    if pd.isna(x):
        return np.nan

    x = str(x).strip()

    if x == "Less than 1 year":
        return 0.5
    if x == "More than 50 years":
        return 50

    try:
        return float(x)
    except:
        return np.nan


df["YearsCodePro"] = df["YearsCodePro"].apply(convert_experience)
df = df.dropna(subset=["YearsCodePro"])

# =========================================================
# 🚫 OUTLIER REMOVAL
# =========================================================
df = df[(df["ConvertedComp"] > 1000) & (df["ConvertedComp"] < 500000)]

# =========================================================
# 📊 FEATURES & TARGET
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

preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
    ],
    remainder="passthrough"  # keeps YearsCodePro as numeric
)

# =========================================================
# 🌲 MODEL
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
# 🧠 TRAIN
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
# 💾 SAVE MODEL
# =========================================================
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(model, MODEL_PATH)

print(f"Model trained successfully and saved at: {MODEL_PATH}")