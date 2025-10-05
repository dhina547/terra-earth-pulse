from flask import Flask, jsonify, request
from flask_cors import CORS
import h5py
import numpy as np
from pathlib import Path
import pandas as pd

app = Flask(__name__)
CORS(app)

# ===================================================================
# DATA PROCESSING FUNCTION FOR 2D TIME-SERIES
# ===================================================================
def process_mopitt_time_series(year):
    data_folder = Path('../data/mopitt')
    yearly_files = sorted([p for p in data_folder.glob("*.he5") if str(year) in p.name])
    if not yearly_files: return None

    monthly_averages = []
    months = []
    for file_path in yearly_files:
        try:
            month_str = file_path.name.split('-')[1]
            date = pd.to_datetime(month_str, format='%Y%m')
            with h5py.File(file_path, "r") as f:
                grid = f['HDFEOS']['GRIDS']['MOP03']
                co_data = grid['Data Fields']['RetrievedCOTotalColumnDay'][:]
                month_mean = float(np.nanmean(co_data)) # Convert to standard float
                monthly_averages.append(month_mean)
                months.append(date.strftime('%Y-%m'))
        except IndexError:
            pass
    if not months: return None
    return {"months": months, "averages": monthly_averages}

# ===================================================================
# DATA PROCESSING FUNCTION FOR 3D GLOBE
# ===================================================================
def process_annual_map_data(year):
    data_folder = Path('../data/mopitt')
    yearly_files = sorted([p for p in data_folder.glob("*.he5") if str(year) in p.name])
    if not yearly_files: return None

    all_monthly_data = []
    for file_path in yearly_files:
        try:
            with h5py.File(file_path, "r") as f:
                grid = f['HDFEOS']['GRIDS']['MOP03']
                co_data = grid['Data Fields']['RetrievedCOTotalColumnDay'][:]
                all_monthly_data.append(co_data)
        except Exception:
            pass 
    if not all_monthly_data: return None

    annual_average = np.nanmean(np.stack(all_monthly_data, axis=-1), axis=2)
    # Replace any NaN values with None, which becomes 'null' in JSON
    annual_average = np.where(np.isnan(annual_average), None, annual_average)

    with h5py.File(yearly_files[0], "r") as f:
        grid = f['HDFEOS']['GRIDS']['MOP03']
        lat = grid['Data Fields']['Latitude'][:]
        lon = grid['Data Fields']['Longitude'][:]
    
    return {
        "lon": lon.tolist(),
        "lat": lat.tolist(),
        "grid": annual_average.T.tolist(),
    }

# ===================================================================
# API ENDPOINTS
# ===================================================================
@app.route('/api/timeseries', methods=['GET'])
def get_timeseries_data():
    """ Endpoint for the 2D time-series graph. """
    year = request.args.get('year', default=2020, type=int)
    data = process_mopitt_time_series(year)
    if data: return jsonify(data)
    return jsonify({"error": f"No data found for the year {year}"}), 404

@app.route('/api/annual_map', methods=['GET'])
def get_annual_map_data():
    """ Endpoint for the 3D globe. """
    year = request.args.get('year', default=2020, type=int)
    data = process_annual_map_data(year)
    if data: return jsonify(data)
    return jsonify({"error": f"No data found for the year {year}"}), 404

# ===================================================================
# RUN THE APP
# ===================================================================
if __name__ == '__main__':
    app.run(debug=True)