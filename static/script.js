function scrollToChecker() {
    document.getElementById("checker").scrollIntoView({
        behavior: "smooth"
    });
}


function previewImage(event) {

    const image = document.getElementById("preview");
    const file = event.target.files[0];

    if (file) {
        image.src = URL.createObjectURL(file);
        image.style.display = "block";
    }
}


function checkQuality() {

    const color = document.getElementById("color").value;
    const weight = document.getElementById("weight").value;
    const firmness = document.getElementById("firmness").value;
    const sugar = document.getElementById("sugar").value;
    const acidity = document.getElementById("acidity").value;

    const resultText = document.getElementById("resultText");

    // Check all fields
    if (
        color === "" ||
        weight === "" ||
        firmness === "" ||
        sugar === "" ||
        acidity === ""
    ) {
        resultText.innerText =
            "Please enter all quality information.";

        return;
    }

    // Send data to Flask backend
    fetch("/predict-data", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            color: color,
            weight: weight,
            firmness: firmness,
            sugar: sugar,
            acidity: acidity

        })

    })

    .then(response => response.json())

    .then(data => {

        if (data.prediction) {

            resultText.innerText =
                "Prediction: " + data.prediction;

        } else {

            resultText.innerText =
                "Error: " + data.error;

        }

    })

    .catch(error => {

        console.error(error);

        resultText.innerText =
            "Error connecting to the server.";

    });
}