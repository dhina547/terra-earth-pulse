import h5py
import numpy as np
from pathlib import Path
import pandas as pd
import json

# This custom encoder helps save special NumPy data types to JSON
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return None if np.isnan(obj) else float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

def process_data_for_all_years():
    """
    Processes all MOPITT data and saves it to a single JSON file.
    """
    print("Starting pre-processing...")
    data_folder = Path('../data/mopitt')
    all_files = list(data_folder.glob("*.he5"))
    
    # Find the range of years available in your data
    years = sorted(list(set([p.name.split('-')[1][:4] for p in all_files if '-' in p.name])))
    
    final_data = {}

    for year in years:
        print(f"Processing year: {year}...")
        yearly_files = [p for p in all_files if str(year) in p.name]
        
        # --- Process for Time-Series ---
        monthly_averages = []
        months = []
        all_monthly_data_for_avg = []

        for file_path in sorted(yearly_files):
            try:
                month_str = file_path.name.split('-')[1]
                date = pd.to_datetime(month_str, format='%Y%m')
                with h5py.File(file_path, "r") as f:
                    grid = f['HDFEOS']['GRIDS']['MOP03']
                    co_data = grid['Data Fields']['RetrievedCOTotalColumnDay'][:]
                    all_monthly_data_for_avg.append(co_data) # For annual average
                    
                    month_mean = np.nanmean(co_data)
                    monthly_averages.append(month_mean)
                    months.append(date.strftime('%Y-%m'))
            except Exception:
                pass
        
        # --- Process for Annual Map ---
        if all_monthly_data_for_avg:
            annual_average = np.nanmean(np.stack(all_monthly_data_for_avg, axis=-1), axis=2)
            with h5py.File(yearly_files[0], "r") as f:
                grid = f['HDFEOS']['GRIDS']['MOP03']
                lat = grid['Data Fields']['Latitude'][:]
                lon = grid['Data Fields']['Longitude'][:]

            # Store all processed data for this year
            final_data[year] = {
                "timeseries": {"months": months, "averages": monthly_averages},
                "annual_map": {
                    "lon": lon,
                    "lat": lat,
                    "grid": annual_average.T,
                }
            }

    # Save the entire dictionary to a JSON file
    output_path = Path("processed_data.json")
    with open(output_path, 'w') as f:
        json.dump(final_data, f, cls=NumpyEncoder)
        
    print(f"\nProcessing complete! Data saved to {output_path}")

if __name__ == '__main__':
    process_data_for_all_years()