import duckdb
import streamlit as st
import os

# ─────────────────────────────────────────────────────────────────────────────
# Connexion Silver  (données brutes / streaming)
# ─────────────────────────────────────────────────────────────────────────────

@st.cache_resource
def get_connection():
    """
    Initialise une connexion DuckDB en mémoire.
    Configure le support MinIO (S3) et crée une vue sur la couche Silver.
    """
    conn = duckdb.connect(database=':memory:', read_only=False)

    # Configuration S3 (MinIO) — utilisé si httpfs est disponible
    try:
        conn.execute("INSTALL httpfs;")
        conn.execute("LOAD httpfs;")
        conn.execute("SET s3_endpoint='localhost:9000';")
        conn.execute("SET s3_access_key_id='minioadmin';")
        conn.execute("SET s3_secret_access_key='minioadmin';")
        conn.execute("SET s3_url_style='path';")
        conn.execute("SET s3_use_ssl='false';")
    except Exception as e:
        st.warning(f"Information: Extension httpfs non chargée ou configuration S3 ignorée ({e})")

    # Vue Silver
    silver_dir = os.path.join(os.getcwd(), '..', 'data', 'silver')
    silver_glob = os.path.join(silver_dir, '**', '*.parquet').replace("\\", "/")
    if os.path.exists(silver_dir):
        try:
            conn.execute(
                f"CREATE VIEW IF NOT EXISTS silver_data AS "
                f"SELECT * FROM read_parquet('{silver_glob}', hive_partitioning=1);"
            )
        except Exception:
            pass

    return conn


# ─────────────────────────────────────────────────────────────────────────────
# Connexion Gold  (agrégats ML + vecteurs Waveform)
# ─────────────────────────────────────────────────────────────────────────────

@st.cache_resource
def get_gold_connection():
    """
    Connexion DuckDB dédiée à la couche Gold (Parquet partitionné station/hour).
    Crée deux vues :
      • gold_stats    — agrégats statistiques (mean/std amplitude, count_peaks, …)
      • gold_waveform — signaux normalisés + métadonnées de tracé
    """
    conn = duckdb.connect(database=':memory:', read_only=False)

    gold_dir  = os.path.join(os.getcwd(), '..', 'data', 'gold')
    gold_glob = os.path.join(gold_dir, '**', '*.parquet').replace("\\", "/")

    if os.path.exists(gold_dir):
        try:
            # Vue globale Gold
            conn.execute(
                f"CREATE VIEW IF NOT EXISTS gold_data AS "
                f"SELECT * FROM read_parquet('{gold_glob}', hive_partitioning=1);"
            )
            # Vue légère : uniquement les colonnes de stats (sans le vecteur, pour les dashboards rapides)
            conn.execute(
                """
                CREATE VIEW IF NOT EXISTS gold_stats AS
                SELECT
                    station, hour, lat, lon, depth,
                    window_start, window_end,
                    mean_amplitude, std_dev_amplitude, count_peaks,
                    start_time_utc, signal_unit, sampling_rate_ds
                FROM gold_data;
                """
            )
            # Vue waveform : inclut le vecteur normalisé (Array<Double>)
            conn.execute(
                """
                CREATE VIEW IF NOT EXISTS gold_waveform AS
                SELECT
                    station, hour, lat, lon, depth,
                    window_start, window_end,
                    start_time_utc, signal_unit, sampling_rate_ds,
                    mean_amplitude, count_peaks,
                    waveform_normalized
                FROM gold_data
                WHERE waveform_normalized IS NOT NULL;
                """
            )
        except Exception:
            pass

    return conn


# ─────────────────────────────────────────────────────────────────────────────
# Helpers Silver
# ─────────────────────────────────────────────────────────────────────────────

@st.cache_data(ttl=60)
def get_stations_list():
    """Retourne la liste triée des stations présentes dans Silver."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT DISTINCT station FROM silver_data WHERE station IS NOT NULL ORDER BY station"
        ).fetchall()
        return [r[0] for r in rows]
    except Exception:
        return []


@st.cache_data(ttl=60)
def get_wave_data(station_name):
    """DataFrame Pandas des données Silver pour une station donnée."""
    conn = get_connection()
    try:
        query = f"""
            SELECT network, station, starttime, endtime,
                   sampling_rate, npts, max_amplitude, year, month
            FROM silver_data
            WHERE station = '{station_name}'
            ORDER BY starttime ASC
        """
        return conn.execute(query).df()
    except Exception as e:
        st.error(f"Impossible de récupérer les données pour '{station_name}' : {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Helpers Gold
# ─────────────────────────────────────────────────────────────────────────────

@st.cache_data(ttl=60)
def get_gold_stations_list():
    """Retourne la liste triée des stations présentes dans Gold."""
    conn = get_gold_connection()
    try:
        rows = conn.execute(
            "SELECT DISTINCT station FROM gold_waveform ORDER BY station"
        ).fetchall()
        return [r[0] for r in rows]
    except Exception:
        return []


@st.cache_data(ttl=60)
def get_waveform_data(station_name: str, limit: int = 50):
    """
    Retourne un DataFrame Pandas contenant les enregistrements Gold
    d'une station, incluant le vecteur waveform_normalized.

    Paramètres
    ----------
    station_name : str
        Code de la station sismique.
    limit : int
        Nombre maximum d'événements retournés (les plus récents en premier).
        Permet de limiter la charge côté front-end.
    """
    conn = get_gold_connection()
    try:
        query = f"""
            SELECT
                station, hour, lat, lon, depth,
                window_start, window_end,
                start_time_utc, signal_unit, sampling_rate_ds,
                mean_amplitude, count_peaks,
                waveform_normalized
            FROM gold_waveform
            WHERE station = '{station_name}'
            ORDER BY window_start DESC
            LIMIT {limit}
        """
        return conn.execute(query).df()
    except Exception as e:
        st.error(f"Erreur lors de la récupération des waveforms Gold pour '{station_name}' : {e}")
        return None


@st.cache_data(ttl=60)
def get_gold_stats(filters: dict | None = None):
    """
    Retourne le DataFrame des stats Gold (sans vecteur) pour le dashboard.
    `filters` peut contenir : station, min_depth, max_depth, min_amplitude.
    """
    conn = get_gold_connection()
    wheres = ["1=1"]
    if filters:
        if "station" in filters and filters["station"]:
            wheres.append(f"station = '{filters['station']}'")
        if "min_depth" in filters:
            wheres.append(f"depth >= {filters['min_depth']}")
        if "max_depth" in filters:
            wheres.append(f"depth <= {filters['max_depth']}")
        if "min_amplitude" in filters:
            wheres.append(f"mean_amplitude >= {filters['min_amplitude']}")
    where_clause = " AND ".join(wheres)
    try:
        return conn.execute(
            f"SELECT * FROM gold_stats WHERE {where_clause} ORDER BY window_start DESC"
        ).df()
    except Exception as e:
        st.error(f"Erreur Gold stats : {e}")
        return None
