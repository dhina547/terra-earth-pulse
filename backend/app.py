from flask import Flask, jsonify, request
from flask_cors import CORS
import h5py
import numpy as np
from pathlib import Path
import pandas as pd

app = Flask(__name__)
CORS(app)

def process_mopitt_data(year):
    data_folder = Path('../data/mopitt')
    all_files = list(data_folder.glob("*.he5"))
    yearly_files = sorted([p for p in all_files if str(year) in p.name])

    if not yearly_files:
        return None

    monthly_averages = []
    months = []

    for file_path in yearly_files:
        try:
            month_str = file_path.name.split('-')[1]
            date = pd.to_datetime(month_str, format='%Y%m')
            
            with h5py.File(file_path, "r") as f:
                grid = f['HDFEOS']['GRIDS']['MOP03']
                co_data = grid['Data Fields']['RetrievedCOTotalColumnDay'][:]
                
                # --- THIS IS THE CORRECTED LINE ---
                # Convert the NumPy float32 to a standard Python float
                month_mean = float(np.nanmean(co_data))
                
                monthly_averages.append(month_mean)
                months.append(date.strftime('%Y-%m'))
        except IndexError:
            print(f"Skipping file with unexpected name: {file_path.name}")

    if not months:
        return None

    return {"months": months, "averages": monthly_averages}

@app.route('/api/timeseries', methods=['GET'])
def get_timeseries_data():
    year = request.args.get('year', default=2020, type=int)
    data = process_mopitt_data(year)
    
    if data:
        return jsonify(data)
    else:
        return jsonify({"error": f"No data found for the year {year}"}), 404

if __name__ == '__main__':
    app.run(debug=True)