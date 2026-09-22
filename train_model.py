import pandas as pd
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier


# Load dataset
data = pd.read_csv("dataset/quality_dataset.csv")

print("Dataset:")
print(data)
print("\nDataset shape:", data.shape)


# Input columns
X = data[[
    "Color",
    "Weight",
    "Firmness",
    "Sugar",
    "Acidity"
]]

# Output column
y = data["Quality"]


# Categorical columns
categorical_columns = [
    "Color",
    "Firmness",
    "Sugar",
    "Acidity"
]

# Numeric column
numeric_columns = [
    "Weight"
]


# Convert text values into numbers
preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_columns
        ),
        (
            "numeric",
            "passthrough",
            numeric_columns
        )
    ]
)


# Decision Tree model
model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", DecisionTreeClassifier(random_state=42))
    ]
)


# Train model
model.fit(X, y)


# Save complete model
joblib.dump(model, "quality_model.pkl")


print("\nModel trained successfully!")
print("Model saved as quality_model.pkl")