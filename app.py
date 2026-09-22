from flask import Flask, render_template, request, jsonify
import pandas as pd
import joblib

app = Flask(__name__)

# Load trained ML model
model = joblib.load("quality_model.pkl")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict-data", methods=["POST"])
def predict_data():

    try:
        data = request.get_json()

        # Get values from website
        color = data["color"]
        weight = float(data["weight"])
        firmness = data["firmness"]
        sugar = data["sugar"]
        acidity = data["acidity"]

        # Create input for ML model
        input_data = pd.DataFrame([{
            "Color": color,
            "Weight": weight,
            "Firmness": firmness,
            "Sugar": sugar,
            "Acidity": acidity
        }])

        # Make prediction
        prediction = model.predict(input_data)[0]

        # Convert prediction into readable result
        if prediction == "Good":
            result = "Good to Eat"
        elif prediction == "Bad":
            result = "Bad to Eat"
        else:
            result = "Artificial"

        return jsonify({
            "prediction": result
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(debug=True)