import os
import math
import numpy as np
import pandas as pd
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import joblib
from werkzeug.utils import secure_filename

# 1. Initialize Flask app and enable CORS
app = Flask(__name__)
CORS(app)

# Configuration: Paths for models and temporary uploads
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(BASE_DIR, 'model', 'FreshGuard_Good_Bad_MobileNetV2.keras')):
    IMAGE_MODEL_PATH = os.path.join(BASE_DIR, 'model', 'FreshGuard_Good_Bad_MobileNetV2.keras')
    RF_MODEL_PATH = os.path.join(BASE_DIR, 'model', 'FreshGuard_random_forest.pkl')
else:
    IMAGE_MODEL_PATH = os.path.join(BASE_DIR, '..', '..', 'backend', 'model', 'FreshGuard_Good_Bad_MobileNetV2.keras')
    RF_MODEL_PATH = os.path.join(BASE_DIR, '..', '..', 'backend', 'model', 'FreshGuard_random_forest.pkl')

UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 2. Load the trained models at startup
print(f"Loading FreshGuard AI Image model from: {IMAGE_MODEL_PATH}")
image_model = tf.keras.models.load_model(IMAGE_MODEL_PATH)
print("Image model loaded successfully!")

print(f"Loading FreshGuard AI Random Forest model from: {RF_MODEL_PATH}")
rf_model = joblib.load(RF_MODEL_PATH)
print("Random Forest model loaded successfully!")

# Image model parameters
IMAGE_SIZE = (224, 224)

# Structured Random Forest parameters & feature schema
REQUIRED_MANUAL_COLUMNS = [
    'fruit',
    'color',
    'size',
    'weight_g',
    'firmness',
    'sugar_brix',
    'acidity_ph',
    'texture',
    'spots',
    'bruises',
    'wrinkles',
    'days_after_harvest',
    'storage_temperature_c'
]

NUMERIC_FIELDS = [
    'weight_g',
    'sugar_brix',
    'acidity_ph',
    'days_after_harvest',
    'storage_temperature_c'
]

# Supported categorical options from trained OneHotEncoder
SUPPORTED_CATEGORIES = {
    'fruit': {
        'Apple', 'Banana', 'Capsicum', 'Carrot', 'Cucumber', 'Grapes',
        'Guava', 'Mango', 'Orange', 'Papaya', 'Pineapple', 'Pomegranate',
        'Potato', 'Tomato', 'Watermelon'
    },
    'color': {
        'brown', 'dark green', 'dark red', 'green', 'light brown',
        'orange', 'purple', 'red', 'yellow'
    },
    'size': {
        'large', 'medium', 'small'
    },
    'firmness': {
        'high', 'low', 'medium'
    },
    'texture': {
        'damaged', 'firm', 'fresh', 'rough', 'smooth', 'soft', 'wrinkled'
    },
    'spots': {
        'no', 'yes'
    },
    'bruises': {
        'no', 'yes'
    },
    'wrinkles': {
        'no', 'yes'
    }
}


@app.route('/', methods=['GET'])
def home():
    """Health check and welcome endpoint."""
    return jsonify({
        "status": "success",
        "message": "FreshGuard AI Backend is Running"
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    """
    Image prediction endpoint for FreshGuard AI.
    Accepts an uploaded image and classifies freshness/quality.
    """
    if 'image' not in request.files:
        return jsonify({
            "error": "No image file provided in request. Please use the form field 'image'."
        }), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({
            "error": "No file selected for upload."
        }), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        image = Image.open(filepath)
        image = image.convert('RGB')
        image = image.resize(IMAGE_SIZE)
        img_array = np.array(image, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0)

        raw_prediction = image_model.predict(img_array)
        score = float(raw_prediction[0][0])

        if score >= 0.5:
            prediction_label = "Good to Eat"
            confidence = round(score * 100, 2)
        else:
            prediction_label = "Bad to Eat"
            confidence = round((1.0 - score) * 100, 2)

        return jsonify({
            "prediction": prediction_label,
            "confidence": confidence
        }), 200

    except Exception as e:
        return jsonify({
            "error": f"Invalid image file or prediction error: {str(e)}"
        }), 400

    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass


@app.route('/predict-manual', methods=['POST'])
def predict_manual():
    """
    Structured-data prediction endpoint for FreshGuard AI.
    Accepts JSON input with 13 food quality parameters and predicts freshness.
    """
    if not request.is_json:
        return jsonify({
            "error": "Request must be JSON with Content-Type: application/json."
        }), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid JSON format. Expected an object with 13 feature fields."
        }), 400

    # 1. Validate all 13 fields are present
    missing_fields = [
        field for field in REQUIRED_MANUAL_COLUMNS
        if field not in data or data[field] is None or data[field] == ''
    ]
    if missing_fields:
        return jsonify({
            "error": f"Missing required fields: {', '.join(missing_fields)}"
        }), 400

    clean_data = {}

    # 2. Validate categorical values against model-supported categories
    for field, valid_categories in SUPPORTED_CATEGORIES.items():
        val = str(data[field]).strip()
        match = next((cat for cat in valid_categories if cat.lower() == val.lower()), None)
        if not match:
            return jsonify({
                "error": f"Invalid value '{val}' for field '{field}'. Allowed values: {sorted(list(valid_categories))}"
            }), 400
        clean_data[field] = match

    # 3. Validate numeric fields
    for field in NUMERIC_FIELDS:
        val = data[field]
        try:
            num_val = float(val)
            if math.isnan(num_val) or math.isinf(num_val):
                raise ValueError("Number cannot be NaN or Infinite.")
            clean_data[field] = num_val
        except (ValueError, TypeError):
            return jsonify({
                "error": f"Field '{field}' must be a valid number. Received: {val}"
            }), 400

    try:
        # 4. Create Pandas DataFrame with exact columns in exact required order
        df_input = pd.DataFrame([clean_data], columns=REQUIRED_MANUAL_COLUMNS)

        # 5. Execute model prediction and probability calculation
        raw_pred = rf_model.predict(df_input)[0]
        probabilities = rf_model.predict_proba(df_input)[0]

        # 6. Map confidence to predicted class probability
        classes_list = list(rf_model.classes_)
        pred_idx = classes_list.index(raw_pred)
        confidence = round(float(probabilities[pred_idx]) * 100, 2)

        # 7. Return expected JSON format
        return jsonify({
            "prediction": str(raw_pred),
            "confidence": confidence
        }), 200

    except Exception as e:
        return jsonify({
            "error": f"Prediction error: {str(e)}"
        }), 400


if __name__ == '__main__':
    # Run the Flask server on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
