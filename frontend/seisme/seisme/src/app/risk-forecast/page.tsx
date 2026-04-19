'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faMapMarkedAlt, faChartLine, faBrain, faPlay, faDownload, faInfoCircle, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

interface RiskZone {
  id: string;
  latitude: number;
  longitude: number;
  riskLevel: 'faible' | 'moyen' | 'fort';
  riskScore: number;
  predictedMagnitude: number;
  confidence: number;
  historicalEvents: number;
  lastEvent: string;
  depth: number;
  features: {
    seismicActivity: number;
    proximity: number;
    frequency: number;
    energy: number;
  };
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mae: number;
  rmse: number;
}

export default function RiskForecastPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);
  const [showModelDetails, setShowModelDetails] = useState(false);
  
  // Filtres
  const [timeRange, setTimeRange] = useState('10');
  const [minMagnitude, setMinMagnitude] = useState('4.0');
  const [riskThreshold, setRiskThreshold] = useState('0.5');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      setIsLoggedIn(true);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isLoggedIn) {
      generateRiskZones();
      generateModelMetrics();
    }
  }, [isLoggedIn]);

  const generateRiskZones = () => {
    // Simuler l'analyse avec Random Forest
    const zones: RiskZone[] = Array.from({length: 30}, (_, i) => {
      const lat = 16 + Math.random() * 14; // 16 à 30
      const lng = 90 + Math.random() * 14; // 90 à 104
      
      // Simuler les features pour le modèle
      const seismicActivity = Math.random();
      const proximity = Math.random();
      const frequency = Math.random();
      const energy = Math.random();
      
      // Simuler la prédiction Random Forest
      const riskScore = (seismicActivity * 0.4 + proximity * 0.3 + frequency * 0.2 + energy * 0.1);
      const predictedMagnitude = 4 + riskScore * 4; // 4 à 8
      const confidence = 0.7 + Math.random() * 0.3; // 70% à 100%
      
      // Classification du risque
      let riskLevel: 'faible' | 'moyen' | 'fort';
      if (riskScore < 0.33) riskLevel = 'faible';
      else if (riskScore < 0.66) riskLevel = 'moyen';
      else riskLevel = 'fort';
      
      return {
        id: `zone_${i}`,
        latitude: lat,
        longitude: lng,
        riskLevel,
        riskScore,
        predictedMagnitude: parseFloat(predictedMagnitude.toFixed(2)),
        confidence: parseFloat(confidence.toFixed(2)),
        historicalEvents: Math.floor(Math.random() * 50),
        lastEvent: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        depth: Math.random() * 100,
        features: {
          seismicActivity: parseFloat(seismicActivity.toFixed(3)),
          proximity: parseFloat(proximity.toFixed(3)),
          frequency: parseFloat(frequency.toFixed(3)),
          energy: parseFloat(energy.toFixed(3))
        }
      };
    });
    
    setRiskZones(zones);
  };

  const generateModelMetrics = () => {
    // Simuler les métriques du modèle
    setModelMetrics({
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.82 + Math.random() * 0.12,
      recall: 0.88 + Math.random() * 0.08,
      f1Score: 0.84 + Math.random() * 0.1,
      mae: 0.3 + Math.random() * 0.2,
      rmse: 0.5 + Math.random() * 0.3
    });
  };

  const trainModel = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    
    // Simuler l'entraînement du modèle
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          generateRiskZones();
          generateModelMetrics();
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
  };

  const getRiskColor = (riskLevel: string) => {
    switch(riskLevel) {
      case 'faible': return '#10B981'; // green-500
      case 'moyen': return '#F59E0B'; // amber-500
      case 'fort': return '#EF4444'; // red-500
      default: return '#6B7280'; // gray-500
    }
  };

  const getRiskBgColor = (riskLevel: string) => {
    switch(riskLevel) {
      case 'faible': return 'bg-green-100 text-green-800 border-green-200';
      case 'moyen': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'fort': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportRiskReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      model: 'Random Forest',
      parameters: {
        timeRange: `${timeRange} ans`,
        minMagnitude: minMagnitude,
        riskThreshold: riskThreshold
      },
      metrics: modelMetrics,
      highRiskZones: riskZones
        .filter(zone => zone.riskLevel === 'fort')
        .map(zone => ({
          coordinates: `${zone.latitude.toFixed(2)}°, ${zone.longitude.toFixed(2)}°`,
          predictedMagnitude: zone.predictedMagnitude,
          confidence: zone.confidence,
          riskScore: zone.riskScore
        })),
      summary: {
        totalZones: riskZones.length,
        highRisk: riskZones.filter(z => z.riskLevel === 'fort').length,
        mediumRisk: riskZones.filter(z => z.riskLevel === 'moyen').length,
        lowRisk: riskZones.filter(z => z.riskLevel === 'faible').length
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk_forecast_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMapGrid = () => {
    const grid = [];
    for (let lat = -30; lat <= 30; lat += 10) {
      for (let lng = -140; lng <= 140; lng += 20) {
        const zone = riskZones.find(z => 
          Math.abs(z.latitude - lat) < 5 && Math.abs(z.longitude - lng) < 10
        );
        
        grid.push({
          lat,
          lng,
          riskLevel: zone?.riskLevel || 'faible',
          riskScore: zone?.riskScore || 0,
          predictedMagnitude: zone?.predictedMagnitude || 4.0
        });
      }
    }
    return grid;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-200">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-400">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-800 mb-2 flex items-center gap-3 uppercase tracking-tight">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-orange-600" />
                Prévision des Zones de Risque Sismique
              </h1>
              <p className="text-black font-semibold">Identification des zones à risque et estimation de l'intensité potentielle</p>
            </div>
            <button
              onClick={exportRiskReport}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faDownload} />
              Exporter Rapport
            </button>
          </div>
        </div>

        {/* Configuration du modèle */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-400">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-black underline decoration-purple-500 decoration-4 underline-offset-8 uppercase tracking-wide">
            <FontAwesomeIcon icon={faBrain} className="text-purple-600" />
            Configuration du Modèle Random Forest
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2 uppercase">Période historique (années)</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black font-medium"
              >
                <option value="5">5 ans</option>
                <option value="10">10 ans</option>
                <option value="20">20 ans</option>
                <option value="50">50 ans</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-black mb-2 uppercase">Magnitude minimale</label>
              <select
                value={minMagnitude}
                onChange={(e) => setMinMagnitude(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black font-medium"
              >
                <option value="3.0">3.0</option>
                <option value="4.0">4.0</option>
                <option value="5.0">5.0</option>
                <option value="6.0">6.0</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-black mb-2 uppercase">Seuil de risque</label>
              <select
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black font-medium"
              >
                <option value="0.3">Bas (0.3)</option>
                <option value="0.5">Moyen (0.5)</option>
                <option value="0.7">Élevé (0.7)</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={trainModel}
              disabled={isTraining}
              className="px-6 py-3 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlay} />
              {isTraining ? 'Entraînement en cours...' : 'Entraîner le modèle'}
            </button>
            
            <button
              onClick={() => setShowModelDetails(!showModelDetails)}
              className="text-blue-500 hover:text-blue-700 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
              {showModelDetails ? 'Masquer' : 'Afficher'} les métriques
            </button>
          </div>
          
          {isTraining && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progression de l'entraînement</span>
                <span className="text-sm text-gray-600">{trainingProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${trainingProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {showModelDetails && modelMetrics && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-3">Métriques du Modèle</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Accuracy:</span> {(modelMetrics.accuracy * 100).toFixed(1)}%
                </div>
                <div>
                  <span className="font-medium">Precision:</span> {(modelMetrics.precision * 100).toFixed(1)}%
                </div>
                <div>
                  <span className="font-medium">Recall:</span> {(modelMetrics.recall * 100).toFixed(1)}%
                </div>
                <div>
                  <span className="font-medium">F1 Score:</span> {(modelMetrics.f1Score * 100).toFixed(1)}%
                </div>
                <div>
                  <span className="font-medium">MAE:</span> {modelMetrics.mae.toFixed(3)}
                </div>
                <div>
                  <span className="font-medium">RMSE:</span> {modelMetrics.rmse.toFixed(3)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Carte interactive des risques */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faMapMarkedAlt} className="text-blue-500" />
            Carte Interactive des Zones de Risque
          </h2>
          
          <div className="bg-gray-100 rounded-lg p-8 mb-4">
            <div className="grid grid-cols-14 gap-1">
              {getMapGrid().map((cell, i) => {
                const color = getRiskColor(cell.riskLevel);
                const opacity = 0.3 + (cell.riskScore * 0.7);
                
                return (
                  <div
                    key={i}
                    className="aspect-square rounded flex items-center justify-center text-xs font-medium cursor-pointer hover:scale-110 transition-transform"
                    style={{ 
                      backgroundColor: color,
                      opacity,
                      color: cell.riskScore > 0.5 ? 'white' : 'black'
                    }}
                    title={`Lat: ${cell.lat}°, Lon: ${cell.lng}°\nRisque: ${cell.riskLevel}\nMagnitude prédite: ${cell.predictedMagnitude}`}
                    onClick={() => {
                      const zone = riskZones.find(z => 
                        Math.abs(z.latitude - cell.lat) < 5 && Math.abs(z.longitude - cell.lng) < 10
                      );
                      setSelectedZone(zone || null);
                    }}
                  >
                    {cell.predictedMagnitude.toFixed(1)}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Faible risque</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span>Risque moyen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Fort risque</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zones à haut risque */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faShieldAlt} className="text-orange-500" />
            Zones à Haut Risque Prioritaires
          </h2>
          
          <div className="space-y-4">
            {riskZones
              .filter(zone => zone.riskLevel === 'fort')
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 10)
              .map((zone, index) => (
                <div 
                  key={zone.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedZone(zone)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Zone #{index + 1} - {zone.latitude.toFixed(2)}°, {zone.longitude.toFixed(2)}°
                      </h3>
                      <p className="text-gray-600">Profondeur moyenne: {zone.depth.toFixed(1)} km</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {zone.historicalEvents} événements historiques • Dernier: {new Date(zone.lastEvent).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskBgColor(zone.riskLevel)}`}>
                        {zone.riskLevel.toUpperCase()}
                      </span>
                      <p className="mt-2 text-sm text-gray-600">
                        Magnitude prédite: <span className="font-bold">{zone.predictedMagnitude}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Confiance: {(zone.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            
            {riskZones.filter(zone => zone.riskLevel === 'fort').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FontAwesomeIcon icon={faShieldAlt} className="text-4xl mb-2" />
                <p>Aucune zone à fort risque détectée</p>
              </div>
            )}
          </div>
        </div>

        {/* Détails de la zone sélectionnée */}
        {selectedZone && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="text-blue-500" />
              Détails de la Zone Sélectionnée
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Informations Générales</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coordonnées:</span>
                    <span className="font-medium">{selectedZone.latitude.toFixed(2)}°, {selectedZone.longitude.toFixed(2)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Niveau de risque:</span>
                    <span className={`px-2 py-1 rounded text-xs ${getRiskBgColor(selectedZone.riskLevel)}`}>
                      {selectedZone.riskLevel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Score de risque:</span>
                    <span className="font-medium">{selectedZone.riskScore.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Magnitude prédite:</span>
                    <span className="font-medium">{selectedZone.predictedMagnitude}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confiance:</span>
                    <span className="font-medium">{(selectedZone.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Features du Modèle</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Activité sismique:</span>
                    <span className="font-medium">{selectedZone.features.seismicActivity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Proximité des failles:</span>
                    <span className="font-medium">{selectedZone.features.proximity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fréquence des événements:</span>
                    <span className="font-medium">{selectedZone.features.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Énergie accumulée:</span>
                    <span className="font-medium">{selectedZone.features.energy}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistiques */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Résumé Statistique</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="text-red-800 font-semibold">Zones à Fort Risque</h3>
              <p className="text-2xl font-bold text-red-600">
                {riskZones.filter(zone => zone.riskLevel === 'fort').length}
              </p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="text-amber-800 font-semibold">Zones à Risque Moyen</h3>
              <p className="text-2xl font-bold text-amber-600">
                {riskZones.filter(zone => zone.riskLevel === 'moyen').length}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-green-800 font-semibold">Zones à Faible Risque</h3>
              <p className="text-2xl font-bold text-green-600">
                {riskZones.filter(zone => zone.riskLevel === 'faible').length}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-blue-800 font-semibold">Magnitude Maximale Prédite</h3>
              <p className="text-2xl font-bold text-blue-600">
                {Math.max(...riskZones.map(z => z.predictedMagnitude)).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
