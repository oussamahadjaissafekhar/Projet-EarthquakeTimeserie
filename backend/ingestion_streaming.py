import os
import io
import logging
import numpy as np
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, udf, year, month
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType, IntegerType, ArrayType
import obspy

# Forcer le nom d'utilisateur pour Hadoop afin d'éviter l'erreur 'invalid null input: name'
os.environ["HADOOP_USER_NAME"] = "spark"

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def process_seismic_file(file_content, file_path):
    """
    Fonction UDF Python pour traiter le binaire d'un fichier sismique avec ObsPy.
    """
    try:
        # ObsPy peut lire un flux binaire
        stream = obspy.read(io.BytesIO(file_content))
        trace = stream[0]
        
        stats = trace.stats
        network = str(stats.network)
        station = str(stats.station)
        
        # Conversion du datetime ObsPy vers le format datetime standard
        starttime = stats.starttime.datetime
        endtime = stats.endtime.datetime
        
        sampling_rate = float(stats.sampling_rate)
        npts = int(stats.npts)
        
        # Géolocalisation (Spécifique au format SAC)
        lat = 0.0
        lon = 0.0
        depth = 0.0
        mag = 0.0
        if hasattr(stats, 'sac'):
            lat   = float(getattr(stats.sac, 'stla', 0.0))
            lon   = float(getattr(stats.sac, 'stlo', 0.0))
            depth = float(getattr(stats.sac, 'evdp', 0.0))

            # ── Extraction de la magnitude depuis les headers SAC ────────────
            # Ordre de priorité :
            #   1. Champ 'mag' (non-standard mais parfois présent)
            #   2. Champs user0..user2 si la valeur est dans la plage [0, 10]
            #   3. Proxy log10 calculé depuis max_amplitude (fallback garanti)
            _SAC_UNDEFINED = -12345.0  # valeur par défaut du format SAC
            _mag_val = getattr(stats.sac, 'mag', None)
            if _mag_val is not None and _mag_val != _SAC_UNDEFINED and 0.0 <= _mag_val <= 10.0:
                mag = float(_mag_val)
            else:
                for _uf in ['user0', 'user1', 'user2', 'user3']:
                    _v = getattr(stats.sac, _uf, None)
                    if _v is not None and _v != _SAC_UNDEFINED and 0.0 < _v < 10.0:
                        mag = float(_v)
                        break

        # Gestion de la réponse instrumentale (.xml)
        xml_path = file_path.rsplit('.', 1)[0] + '.xml'
        local_xml_path = xml_path.replace("file://", "").replace(
            "s3a://seismic-bucket/", "/opt/bitnami/spark/data/bronze/"
        )

        if os.path.exists(local_xml_path):
            try:
                inv = obspy.read_inventory(local_xml_path)
                trace.remove_response(inventory=inv, output="VEL")
            except Exception as e:
                logging.warning(f"Erreur correction instrumentale {file_path}: {e}")

        max_amplitude = float(np.abs(trace.data).max())

        # ── Fallback magnitude : proxy depuis max_amplitude ──────────────────
        # Formule : Ml ≈ log10(amp_nm) + distance_correction
        # Simplification : on scale log10(max_amplitude+1) vers [0, 9]
        if mag == 0.0 and max_amplitude > 0:
            import math as _math
            mag = round(min(max(_math.log10(abs(max_amplitude) + 1e-9) * 1.5 + 2.0, 0.0), 9.9), 1)

        # ── Extraction du vecteur de signal (Waveform) ───────────────────────
        signal_unit = "m/s" if os.path.exists(local_xml_path) else "counts"
        MAX_PTS = 2000
        raw_data = trace.data.astype(float)
        n = len(raw_data)
        if n > MAX_PTS:
            indices = np.linspace(0, n - 1, MAX_PTS)
            waveform_samples = np.interp(indices, np.arange(n), raw_data).tolist()
        else:
            waveform_samples = raw_data.tolist()

        return (network, station, starttime, endtime, sampling_rate, npts,
                max_amplitude, mag, lat, lon, depth, signal_unit, waveform_samples, "SUCCESS")
        
    except Exception as e:
        error_msg = f"ERROR: {str(e)}"
        logging.error(f"Fichier corrompu ou illisible ({file_path}) : {error_msg}")
        return (None, None, None, None, 0.0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, "unknown", None, error_msg)

# Définition du schéma renvoyé par l'UDF
schema = StructType([
    StructField("network",         StringType(),             True),
    StructField("station",         StringType(),             True),
    StructField("starttime",       TimestampType(),          True),
    StructField("endtime",         TimestampType(),          True),
    StructField("sampling_rate",   DoubleType(),             True),
    StructField("npts",            IntegerType(),            True),
    StructField("max_amplitude",   DoubleType(),             True),
    StructField("mag",             DoubleType(),             True),  # ← Magnitude (SAC ou proxy log10)
    StructField("lat",             DoubleType(),             True),
    StructField("lon",             DoubleType(),             True),
    StructField("depth",           DoubleType(),             True),
    StructField("signal_unit",     StringType(),             True),
    StructField("waveform_samples",ArrayType(DoubleType()),  True),
    StructField("status",          StringType(),             True),
])

# Enregistrement de l'UDF avec PySpark
extract_seismic_udf = udf(process_seismic_file, schema)

def main():
    # Initialisation de la Spark Session
    # Les paramètres de connexion MinIO S3A sont configurés ici pour la source/sink au besoin
    spark = SparkSession.builder \
        .appName("SeismicIngestionStreaming") \
        .master("spark://spark-master:7077") \
        .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
        .config("spark.hadoop.fs.s3a.access.key", "minioadmin") \
        .config("spark.hadoop.fs.s3a.secret.key", "minioadmin") \
        .config("spark.hadoop.fs.s3a.path.style.access", "true") \
        .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false") \
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
        .getOrCreate()

    # Réduire la verbosité des logs PySpark
    spark.sparkContext.setLogLevel("WARN")

    # Chemins basés sur le montage du volume (tout doit être dans data/ pour être visible locally)
    bronze_path = "/opt/bitnami/spark/data/bronze/"
    silver_path = "/opt/bitnami/spark/data/silver/"
    checkpoint_path = "/opt/bitnami/spark/data/checkpoints/ingestion/"

    os.makedirs(bronze_path, exist_ok=True)
    os.makedirs(silver_path, exist_ok=True)
    os.makedirs(checkpoint_path, exist_ok=True)

    # Création du DataStreamReader (lecture de flux en surveillant le dossier bronze)
    # Spark Streaming exige toujours qu'un schéma soit spécifié rigoureusement
    # Pour scanner récursivement de manière ciblée, on utilise l'option native recursiveFileLookup
    binary_schema = "path STRING, modificationTime TIMESTAMP, length LONG, content BINARY"
    raw_df = spark.readStream \
        .format("binaryFile") \
        .option("recursiveFileLookup", "true") \
        .option("maxFilesPerTrigger", 50) \
        .schema(binary_schema) \
        .load(bronze_path)

    # Filtrer manuellement les regex (insensible à la casse)
    filtered_raw_df = raw_df.filter(
        col("path").rlike("(?i)\.(sac|mseed|ms)$")
    )

    # Application de l'UDF
    parsed_df = filtered_raw_df.withColumn("parsed", extract_seismic_udf(col("content"), col("path"))) \
                               .select("parsed.*", "path")

    # ----- DEBUG EN TEMPS RÉEL -----
    # Afin de s'assurer que les fichiers ne plantent pas silencieusement, on affiche un aperçu en console
    preview_query = parsed_df.select("path", "status").writeStream \
        .format("console") \
        .option("truncate", False) \
        .outputMode("append") \
        .start()

    # Gestion des erreurs (on ne garde que les "SUCCESS")
    valid_df = parsed_df.filter(col("status") == "SUCCESS").drop("status", "path")

    # Extraction de l'année et du mois pour le partitionnement
    final_df = valid_df \
        .withColumn("year", year(col("starttime"))) \
        .withColumn("month", month(col("starttime")))

    # Démarrage de l'écriture (Sink) principale
    query = final_df.writeStream \
        .format("parquet") \
        .option("checkpointLocation", checkpoint_path) \
        .partitionBy("year", "month") \
        .outputMode("append") \
        .start(silver_path)

    print("✅ Streaming démarré (50 fichiers par lot). En écoute sur le dossier ./data/bronze/")
    
    # On attend la fin des deux processus virtuels
    spark.streams.awaitAnyTermination()

if __name__ == "__main__":
    main()
