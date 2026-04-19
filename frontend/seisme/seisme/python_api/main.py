from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware 
import pandas as pd
import numpy as np
from statsmodels.tsa.seasonal import STL
from datetime import datetime, timedelta
import json
import os
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",     
        "http://192.168.1.4:3000",   
      
    ],
    allow_credentials=True,
    allow_methods=["*"],             
    allow_headers=["*"],        
)

# Générer des données synthétiques
def generate_seismic_data():
    """
    Generate synthetic daily earthquake count data.
    Replace this with real data loading (e.g., from USGS API or CSV).
    """
    start_date = pd.to_datetime("2020-01-01")
    end_date = pd.to_datetime("2025-12-31")
    dates = pd.date_range(start=start_date, end=end_date, freq='D')

    np.random.seed(42)
    trend = np.linspace(10, 15, len(dates)) 
    seasonal = 2 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25)  
    noise = np.random.normal(0, 1, len(dates))
    observed = trend + seasonal + noise
    observed = np.clip(observed, 0, None)  

    df = pd.DataFrame({
        'date': dates.strftime('%Y-%m-%d').tolist(),
        'observed': observed.tolist()
    })
    return df


# Des données en ligne (Ne fonctionnent pas bien)
def fetch_usgs_earthquake_data():

    end = datetime.utcnow()
    start = end - timedelta(days=5*365)
    url = (
        "https://earthquake.usgs.gov/fdsnws/event/1/query"
        "?format=geojson"
        f"&starttime={start.strftime('%Y-%m-%d')}"
        f"&endtime={end.strftime('%Y-%m-%d')}"
        "&minmagnitude=4.0"
    )
    response = requests.get(url)
    data = response.json()

    # Count quakes per day
    from collections import defaultdict
    counts = defaultdict(int)
    for feat in data['features']:
        date = feat['properties']['time']
        day = datetime.fromtimestamp(date/1000).strftime('%Y-%m-%d')
        counts[day] += 1

    # Create full date range
    all_dates = pd.date_range(start=start, end=end, freq='D')
    observed = [counts[d.strftime('%Y-%m-%d')] for d in all_dates]

    return pd.DataFrame({
        'date': all_dates.strftime('%Y-%m-%d').tolist(),
        'observed': observed
    })


# Mettre votre fichier CSV ici

CSV_PATH = "seisms.csv"

def load_earthquake_data():
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Fichier non trouvé{CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    df = df.fillna("")
    return df

@app.get("/stl")
async def get_stl_decomposition():
    try:
 
        df = generate_seismic_data()

        observed_series = pd.Series(
            df['observed'].values,
            index=pd.to_datetime(df['date'])
        )
        observed_series = observed_series.asfreq('D')  
        observed_series = observed_series.interpolate() 

        stl = STL(observed_series, seasonal=13) 
        result = stl.fit()


        response_data = {
            "dates": df['date'].tolist(),
            "observed": result.observed.tolist(),
            "trend": result.trend.tolist(),
            "seasonal": result.seasonal.tolist(),
            "resid": result.resid.tolist(),
        }

        return JSONResponse(content=response_data)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@app.get("/numbers")
async def get_numbers():
    df = generate_seismic_data()
    total_earthquakes = int(df['observed'].sum())
    avg_daily = float(df['observed'].mean())
    max_magnitude = 9.1  # Magnitude maximum du seisme
    return {
        "total séismes": total_earthquakes,
        "moyenne journalière": round(avg_daily, 2),
        "magnitude max": max_magnitude,
        "période couverte (jours)": len(df)
    }


@app.get("/seisms")
async def get_seisms(
    page: int = 1, 
    limit: int = 10,
    min_mag: float = None,
    max_mag: float = None,
    min_depth: float = None,
    max_depth: float = None
):
    try:
        df = load_earthquake_data()
        
        # Convertir la colonne mag en numérique, en gérant les erreurs
        df['mag'] = pd.to_numeric(df['mag'], errors='coerce')
        
        # Appliquer les filtres de magnitude
        if min_mag is not None:
            df = df[df['mag'] >= min_mag]
        if max_mag is not None:
            df = df[df['mag'] <= max_mag]
            
        # Appliquer les filtres de profondeur
        if min_depth is not None:
            df = df[df['depth'] >= min_depth]
        if max_depth is not None:
            df = df[df['depth'] <= max_depth]
        
        # Trier par date (du plus récent au plus ancien)
        df = df.sort_values('time', ascending=False)
        
        total = len(df)
        
        # Pagination
        start = (page - 1) * limit
        end = start + limit
        paginated_df = df.iloc[start:end]

        data = paginated_df.to_dict(orient="records")

        return JSONResponse({
            "data": data,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )