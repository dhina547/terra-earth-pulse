from flask import Flask, jsonify, request
from flask_cors import CORS
import json

# Initialize the Flask app
app = Flask(__name__)
CORS(app)

# Load the pre-processed data once when the server starts up
try:
    with open('processed_data.json', 'r') as f:
        all_data = json.load(f)
    print("Successfully loaded pre-processed_data.json")
except FileNotFoundError:
    print("CRITICAL ERROR: 'processed_data.json' not found.")
    print("Please run the preprocess.py script first in the backend folder.")
    all_data = {} # Set to an empty dictionary to prevent crashing

# ===================================================================
# API ENDPOINTS (Now much simpler)
# ===================================================================

@app.route('/api/timeseries', methods=['GET'])
def get_timeseries_data():
    """ Endpoint for the 2D time-series graph. Reads from the loaded data. """
    # Get the year as a string to match the keys in the JSON file
    year = request.args.get('year', '2020') 
    
    if year in all_data:
        return jsonify(all_data[year]['timeseries'])
    else:
        return jsonify({"error": f"No data found for the year {year}"}), 404

@app.route('/api/annual_map', methods=['GET'])
def get_annual_map_data():
    """ Endpoint for the 3D globe. Reads from the loaded data. """
    # Get the year as a string
    year = request.args.get('year', '2020') 
    
    if year in all_data:
        return jsonify(all_data[year]['annual_map'])
    else:
        return jsonify({"error": f"No data found for the year {year}"}), 404

# ===================================================================
# RUN THE APP
# ===================================================================
