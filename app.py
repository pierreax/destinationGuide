import os
from flask import Flask, render_template, request, jsonify
from openai import OpenAI

app = Flask(__name__)

def get_openai_api_key():
    return os.getenv("OPENAI_API_KEY")

def generate_response(prompt):
    client = OpenAI(api_key=get_openai_api_key())
    stream = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        stream=True,
    )
    response = ""
    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            response += chunk.choices[0].delta.content
    return response.strip()

def extract_city_country_and_response(response):
    lines = response.split('\n', 1)  # Split the response into two parts at the first newline
    city_country = lines[0].split('.')[0].strip()  # Ensure only the "City, Country" part is included
    full_response_without_city_country = lines[1].strip() if len(lines) > 1 else ""
    return city_country, full_response_without_city_country

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/suggest-destination', methods=['POST'])
def suggest_destination():
    preferences = {
        'destination_type': request.form['destination_type'],
        'activity': request.form['activity'],
        'climate': request.form['climate'],
        'budget': request.form['budget'],
        'month': request.form['month']
    }
    prompt = f"Suggest a travel destination based on the following preferences. Start the response with the city and country name in the format 'City, Country'. Follow this with a detailed explanation but do not repeat the city and country in the explanation:\n" \
             f"Destination type: {preferences['destination_type']}\n" \
             f"Activities: {preferences['activity']}\n" \
             f"Climate: {preferences['climate']}\n" \
             f"Budget: {preferences['budget']}\n" \
             f"Month: {preferences['month']}"
    full_response = generate_response(prompt)
    city_country, full_response_without_city_country = extract_city_country_and_response(full_response)
    # Return the city_country first, followed by the full_response
    return jsonify({'suggestion': city_country, 'full_response': full_response_without_city_country})

if __name__ == "__main__":
    app.run(debug=True)
