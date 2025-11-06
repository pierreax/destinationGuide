import os
import json
from flask import Flask, render_template, request, jsonify, send_from_directory, Response
from anthropic import Anthropic

# Configure Flask to use current directory for templates and static files (Azure compatibility)
app = Flask(__name__,
            template_folder='.',
            static_folder='.',
            static_url_path='')

def get_anthropic_api_key():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("WARNING: ANTHROPIC_API_KEY environment variable is not set!")
    else:
        print(f"API key found: {api_key[:10]}..." if len(api_key) > 10 else "API key found (short)")
    return api_key

def generate_response(prompt):
    client = Anthropic(api_key=get_anthropic_api_key())

    # Use Claude 3 Haiku for fast, cost-effective responses
    response = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return response.content[0].text.strip()

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
    # Handle both JSON and form data
    if request.is_json:
        data = request.json
        preferences = data.get('preferences', {})
    else:
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
    # Generate response
    full_response = generate_response(prompt)

    # For SSE streaming format expected by script.js
    def generate():
        # Send the full response
        yield f"event: full_response\ndata: {json.dumps({'full_response': full_response})}\n\n"
        # Send end event
        yield f"event: end\ndata: {json.dumps({})}\n\n"

    return Response(generate(), mimetype='text/event-stream')

if __name__ == "__main__":
    # Azure Web App provides PORT environment variable
    port = int(os.environ.get('PORT', 5000))
    # Disable debug in production
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)
