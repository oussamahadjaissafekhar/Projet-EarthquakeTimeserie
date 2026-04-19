# 🌍 Observatoire Mondial des Séismes - Plateforme Big Data

Ce projet de fin d'études en Mégadonnées (M2 UPEC) propose une solution complète de traitement, d'analyse et de visualisation de données sismologiques massives couvrant la période 2000-2018.

## 📖 Description du Projet

L'objectif est de transformer des fichiers sismiques bruts (signaux complexes et hétérogènes) en informations exploitables pour différents profils d'utilisateurs. Le système repose sur une **Architecture Medallion** (Bronze, Silver, Gold) orchestrée par **Apache Spark** pour le calcul distribué et **DuckDB** pour des requêtes analytiques ultra-rapides.

### Points Forts Techniques :
- **Pipeline ETL Distribué** : Nettoyage, Filtrage (Band-pass) et Normalisation (Z-Score) via Spark.
- **Stockage Optimisé** : Utilisation du format Apache Parquet pour une compression et une vitesse de lecture colonnaire maximales.
- **Recherche Naturelle (NLP)** : Interface de recherche intelligente pour filtrer les données sans SQL.
- **Analyse Avancée** : Décomposition de séries temporelles (STL) et Studio d'Analyse DSP.
- **Machine Learning** : Prédictions de magnitude via Random Forest et réseaux de neurones LSTM.

## 🏗 Architecture du Pipeline (Medallion)
- **Bronze** : Données brutes (fichiers binaires SAC/MSeed, XML).
- **Silver** : Données nettoyées, détrendées et filtrées géographiquement par Spark.
- **Gold** : Données agrégées par fenêtres de 10 minutes avec extraction de caractéristiques (SNR, Amplitude Max, Waveform normalisée).

## 🚀 Installation et Lancement

### 1. Prérequis
- Docker et Docker Compose
- Python 3.9+
- Environnement Spark (fourni via l'image Docker custom dans le projet)

### 2. Lancement des Services
```bash
# 1. Cloner le repository
git clone <votre-url-repo>
cd seismic-project

# 2. Lancer l'infrastructure (Spark, MinIO, MySQL)
cd backend
docker-compose up -d

# 3. Lancer l'API Backend
cd api
.\start_server.ps1
```

### 3. Exécution du Pipeline de Données
*Important : Respectez l'ordre séquentiel pour garantir l'intégrité des couches. Si vous changez le schéma (ex: ajout de la colonne mag), nettoyez les dossiers d'abord.*

```bash
# Étape 0 : Nettoyage des données (Optionnel - pour réinitialisation)
# Windows (PowerShell) : 
Remove-Item -Recurse -Force "backend/data/silver/*", "backend/data/gold/*"

# Étape 1 : Ingestion des données (Bronze -> Silver)
# Traite les fichiers SAC/MSeed et génère la couche Silver Parquet
docker exec -it spark-master spark-submit --master spark://spark-master:7077 /opt/spark-app/ingestion_streaming.py

# Étape 2 : Feature Engineering (Silver -> Gold)
# Détection d'événements, Z-Score et agrégats Gold
docker exec -it spark-master spark-submit --master spark://spark-master:7077 /opt/spark-app/feature_engineering.py
```

### 4. Lancement du Frontend (Next.js)
```bash
# Se déplacer dans le dossier du frontend
cd frontend/seisme/seisme

# Lancer en mode développement
npm install
npm run dev
```

## 👥 Profils Utilisateurs et Interfaces
L'interface s'adapte aux besoins de chaque acteur :

| Rôle | Interface Clé | Fonctionnalité |
| :--- | :--- | :--- |
| **Public** | Observatoire Mondial | Recherche NLP et carte interactive simplifiée. |
| **Sismologue** | Studio d'Analyse | Filtrage DSP, décomposition STL et Z-Score. |
| **Sécurité Civile** | Gestion de Crise | Monitoring temps réel et génération de rapports. |
| **Data Scientist** | Lab IA | Entraînement Random Forest/LSTM et prédictions. |
| **Data Engineer** | Monitoring Pipeline | Audit des couches Bronze/Silver/Gold. |

## 📊 Paramètres Métiers Calculés
Le système extrait automatiquement les métriques suivantes pour chaque événement :
- **SNR (Signal-to-Noise Ratio)** : Qualité du signal par rapport au bruit ambiant.
- **Z-Score** : Niveau d'anomalie statistique de la secousse.
- **Pic d'Amplitude** : Énergie maximale détectée (source pour la magnitude).
- **Décomposition STL** : Séparation Tendance / Saisonnalité / Résidus.

## 🛠 Technologies Utilisées
- **Backend** : FastAPI (Python), DuckDB.
- **Traitement Big Data** : Apache Spark (PySpark), NumPy, ObsPy.
- **Frontend** : Next.js (React), Leaflet (Cartographie), Plotly / Chart.js.
- **Format de données** : Apache Parquet.
- **Déploiement** : Docker / Docker-Compose.

Réalisé par l'équipe "B" M2 UPEC - Promotion 2026

## 📂 Configuration des Données (Important pour le Test)

Pour des raisons de taille de stockage (4 Go+), les dossiers de données sont fournis vides dans ce dépôt. Pour faire fonctionner l'ingestion :

1.  **Dossier Bronze** : Copiez les fichiers `.sac` (données sismiques brutes) dans `backend/data/bronze/`.
    *   *Les fichiers peuvent être téléchargés ici :* [Kaggle - Earthquake Timeseries analysis (NEFS SAC)](https://www.kaggle.com/datasets/elemento/earthquakes-timeseries-analysis-nefs-sac)
2.  **Pipeline d'ingestion** : Lancez le script `ingestion_streaming.py` pour traiter les fichiers et alimenter les couches **Silver** et **Gold**.
3.  **Dossiers Silver/Gold** : Ils seront automatiquement remplis par Spark lors de l'ingestion, permettant au dashboard et à l'IA de fonctionner.

