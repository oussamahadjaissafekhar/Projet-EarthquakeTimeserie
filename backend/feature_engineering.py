import os
import logging
import numpy as np
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col,
    hour,
    when,
    avg,
    stddev,
    sum as spark_sum,
    window,
    udf,
    to_date,
    date_format,
    concat_ws,
    struct,
    max as spark_max,
)
from pyspark.sql.types import ArrayType, DoubleType
from pyspark.sql.window import Window

# Forcer le nom d'utilisateur pour Hadoop
os.environ["HADOOP_USER_NAME"] = "spark"

# ─────────────────────────────────────────────────────────────
# UDF : Détrend + Normalisation Z-score sur le vecteur brut
# ─────────────────────────────────────────────────────────────
def _normalize_waveform(samples):
    """
    Prend un Array[Double] brut (vecteur Silver) et retourne
    un Array[Double] normalisé, prêt pour l'affichage Waveform.

    Étapes :
      1. Retrait de la tendance linéaire (detrend)
      2. Normalisation Z-score  →  μ=0, σ=1
         Si σ = 0 (signal plat), on retourne un vecteur de zéros
         pour éviter les NaN sur le front-end.
    """
    if samples is None or len(samples) == 0:
        return None

    arr = np.array(samples, dtype=np.float64)

    # 1. Detrend linéaire (supprime la dérive de fond)
    n = len(arr)
    x = np.arange(n, dtype=np.float64)
    # Régression linéaire par moindres carrés (rapide, sans scipy)
    slope = (n * np.dot(x, arr) - x.sum() * arr.sum()) / \
            (n * np.dot(x, x) - x.sum() ** 2 + 1e-12)
    intercept = (arr.sum() - slope * x.sum()) / n
    arr = arr - (slope * x + intercept)

    # 2. Normalisation Z-score
    mu = arr.mean()
    sigma = arr.std()
    if sigma < 1e-12:
        return [0.0] * n  # Signal constant → plat à zéro

    normalized = ((arr - mu) / sigma).tolist()
    return normalized


normalize_waveform_udf = udf(_normalize_waveform, ArrayType(DoubleType()))


def main():
    spark = SparkSession.builder \
        .appName("SeismicFeatureEngineering") \
        .master("spark://spark-master:7077") \
        .config("spark.sql.shuffle.partitions", "20") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")

    silver_path = "/opt/bitnami/spark/data/silver/"
    gold_path   = "/opt/bitnami/spark/data/gold/"

    print("🚀 Chargement des données Silver...")
    
    # Vérification si des fichiers Parquet existent avant de lire
    try:
        # On vérifie s'il y a des fichiers .parquet dans le dossier ou les sous-dossiers
        has_data = False
        if os.path.exists(silver_path):
            for root, dirs, files in os.walk(silver_path):
                if any(f.endswith(".parquet") for f in files):
                    has_data = True
                    break
        
        if not has_data:
            print(f"⚠️ AUCUNE DONNÉE TROUVÉE dans {silver_path}.")
            print("L'ingestion n'a peut-être pas encore trouvé de fichiers valides dans la zone Asie du Sud-Est.")
            print("Le Feature Engineering s'arrête normalement.")
            return

        df_silver = spark.read.parquet(silver_path)
    except Exception as e:
        print(f"❌ Erreur lors de la lecture de Silver : {e}")
        return

    # ──────────────────────────────────────────────
    # 1. Features temporelles
    # ──────────────────────────────────────────────
    df_with_hour = df_silver.withColumn("hour", hour(col("starttime")))

    print("🧠 Calcul des moyennes glissantes et Z-Scores (DSP)...")
    # Fenêtre bornée d'une minute pour ne pas exploser la RAM Worker
    rolling_window = Window.partitionBy("station") \
        .orderBy(col("starttime").cast("long")) \
        .rangeBetween(-60, 0)

    df_stats = df_with_hour \
        .withColumn("rolling_mean", avg("max_amplitude").over(rolling_window)) \
        .withColumn("rolling_std",  stddev("max_amplitude").over(rolling_window))

    df_features = df_stats \
        .withColumn("z_score",
                    when(col("rolling_std") > 0,
                         (col("max_amplitude") - col("rolling_mean")) / col("rolling_std"))
                    .otherwise(0.0)) \
        .withColumn("is_event",
                    when(col("max_amplitude") > (5 * col("rolling_mean")), 1).otherwise(0))

    # ──────────────────────────────────────────────
    # 2. Normalisation du vecteur de signal (Waveform)
    #    On applique l'UDF sur le vecteur brut Silver
    # ──────────────────────────────────────────────
    print("🌊 Normalisation des vecteurs de signal (detrend + Z-score)...")
    df_with_waveform = df_features \
        .withColumn("waveform_normalized", normalize_waveform_udf(col("waveform_samples")))

    # Sampling rate effectif après sous-échantillonnage Silver (≤ 2000 pts)
    df_with_waveform = df_with_waveform.withColumn(
        "sampling_rate_ds",
        when(
            col("npts") > 2000,
            (2000.0 / (col("npts").cast(DoubleType()) / col("sampling_rate")))
        ).otherwise(col("sampling_rate"))
    )

    print("📊 Agrégation par fenêtres de 10 minutes...")
    # ──────────────────────────────────────────────
    # 3. Agrégation finale Gold (logique de partitionnement inchangée)
    # ──────────────────────────────────────────────
    df_gold_raw = df_with_waveform \
        .groupBy(
            col("station"),
            col("hour"),
            col("lat"),
            col("lon"),
            col("depth"),
            window(col("starttime"), "10 minutes")
        ).agg(
            # ── Stats agrégées existantes ──────────────────────────────
            avg("max_amplitude").alias("mean_amplitude"),
            stddev("max_amplitude").alias("std_dev_amplitude"),
            spark_sum("is_event").alias("count_peaks"),
            spark_max("mag").alias("mag"),
            # ── Pick-by-Max-Amplitude (contrat front "analysis") ────────
            spark_max(
                struct(
                    col("max_amplitude").alias("k_max_amp"),
                    col("starttime").alias("k_start_time_utc"),
                    col("signal_unit").alias("k_signal_unit"),
                    col("sampling_rate_ds").alias("k_sampling_rate_ds"),
                    col("waveform_normalized").alias("k_waveform_normalized"),
                )
            ).alias("picked")
        ) \
        .select(
            col("station"),
            col("hour"),
            col("lat"),
            col("lon"),
            col("depth"),
            col("window.start").alias("window_start"),
            col("window.end").alias("window_end"),
            col("mean_amplitude"),
            col("std_dev_amplitude"),
            col("count_peaks"),
            col("mag"),
            # ── Waveform + metadata (picked) ───────────────────────────
            col("picked.k_start_time_utc").alias("start_time_utc"),
            col("picked.k_signal_unit").alias("signal_unit"),
            col("picked.k_sampling_rate_ds").alias("sampling_rate_ds"),
            col("picked.k_waveform_normalized").alias("waveform_normalized"),
        )

    # Partition key + id stable pour API/front
    df_gold = (
        df_gold_raw.withColumn("day", to_date(col("window_start")))
        .withColumn("window_id", concat_ws("_", col("station"), date_format(col("window_start"), "yyyyMMddHHmmss")))
    )

    # ──────────────────────────────────────────────
    # 4. Écriture Gold (partitionnement par day)
    # ──────────────────────────────────────────────
    print("💾 Sauvegarde de la couche Gold...")
    df_gold.write \
        .format("parquet") \
        .mode("overwrite") \
        .partitionBy("station", "day") \
        .save(gold_path)

    print(f"✅ Feature Engineering terminé ! Couche Gold enrichie (pick-by-max + window_id + day) → {gold_path}")


if __name__ == "__main__":
    main()
