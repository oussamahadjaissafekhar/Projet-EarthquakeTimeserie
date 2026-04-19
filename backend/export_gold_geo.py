import os
import duckdb


def main():
    gold_glob = "../data/gold/**/*.parquet"
    output_csv = "seismic_location_features.csv"

    con = duckdb.connect(database=":memory:")

    query_geo = """
        SELECT 
            station,
            lat as latitude,
            lon as longitude,
            depth as profondeur,
            mean_amplitude as amplitude_mean,
            std_dev_amplitude as amplitude_std
        FROM read_parquet(?)
        WHERE lat != 0 AND lon != 0
    """

    df_geo = con.execute(query_geo, [gold_glob]).df()

    os.makedirs(os.path.dirname(output_csv) or ".", exist_ok=True)
    df_geo.to_csv(output_csv, index=False)

    print(f"✅ Export terminé: {output_csv} ({len(df_geo)} lignes)")


if __name__ == "__main__":
    main()
