'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain, faFlask, faDownload, faChartLine, faDatabase, faCog, faPlay, faCheckCircle, faExclamationTriangle, faGlobe, faProjectDiagram, faTimes, faFileCsv, faFileCode } from '@fortawesome/free-solid-svg-icons';

const Plot = dynamic(() => import('../components/PlotlyChart'), { ssr: false });

interface MLFeature {
  eventId: string;
  station: string;
  magnitude: number;
  depth: number;
  snr: number;
  peakAmplitude: number;
  duration: number;
  frequency: number;
  energy: number;
  pWaveArrival: number;
  sWaveArrival: number;
  quality: 'Bronze' | 'Silver' | 'Gold';
  timestamp: string;
}

interface ProcessingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalEvents: number;
  processedEvents: number;
  layer: 'Bronze' | 'Silver' | 'Gold';
}

const FEATURE_LABELS: Record<string, string> = {
  magnitude: 'Magnitude',
  depth: 'Profondeur (km)',
  snr: 'SNR',
  peakAmplitude: 'Pic Amplitude',
  duration: 'Durée (s)',
  frequency: 'Fréquence (Hz)',
  energy: 'Énergie',
  pWaveArrival: 'Onde P (s)',
  sWaveArrival: 'Onde S (s)'
};

export default function IALabPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [features, setFeatures] = useState<MLFeature[]>([]);
  
  // Conf
  const [targetEvents, setTargetEvents] = useState('10000');
  const [selectedLayer, setSelectedLayer] = useState<'Bronze' | 'Silver' | 'Gold'>('Gold');
  const [featureTypes, setFeatureTypes] = useState<Record<string, boolean>>({
    magnitude: true,
    depth: false,
    snr: true,
    peakAmplitude: true,
    duration: true,
    frequency: false,
    energy: true,
    pWaveArrival: false,
    sWaveArrival: false
  });

  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);

  // Modal Correlation
  const [showCorrelation, setShowCorrelation] = useState(false);
  // Modal Export
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      setIsLoggedIn(true);
      generateNewFeatures(50);
    }
  }, [router]);

  const generateNewFeatures = (count: number) => {
    const stations = ['KRIS', 'UGM', 'JD05', 'BKNI', 'BNDI', 'TOLI'];
    const newFeatures: MLFeature[] = Array.from({length: count}, (_, i) => {
      const magnitude = 4 + Math.random() * 5;
      return {
        eventId: `EV_${Date.now()}_${i}`,
        station: stations[Math.floor(Math.random() * stations.length)],
        magnitude: parseFloat(magnitude.toFixed(2)),
        depth: parseFloat((Math.random() * 100).toFixed(1)),
        snr: parseFloat((5 + Math.random() * 45).toFixed(1)),
        peakAmplitude: parseFloat((magnitude * (0.5 + Math.random() * 1.5)).toFixed(3)),
        duration: parseFloat((10 + Math.random() * 300).toFixed(1)),
        frequency: parseFloat((0.1 + Math.random() * 50).toFixed(2)),
        energy: parseFloat((magnitude * magnitude * (1 + Math.random() * 10)).toFixed(2)),
        pWaveArrival: parseFloat((Math.random() * 60).toFixed(2)),
        sWaveArrival: parseFloat((60 + Math.random() * 120).toFixed(2)),
        quality: selectedLayer,
        timestamp: new Date().toISOString()
      };
    });
    setFeatures(newFeatures);
  };

  const startJob = () => {
    const numEvents = parseInt(targetEvents);
    setCurrentJob({ id: `job_${Date.now()}`, status: 'running', progress: 0, totalEvents: numEvents, processedEvents: 0, layer: selectedLayer });
    
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        clearInterval(interval);
        setCurrentJob(prev => prev ? { ...prev, status: 'completed', progress: 100, processedEvents: numEvents } : null);
        generateNewFeatures(Math.min(numEvents, 100)); // Just display 100 in table to avoid lag
      } else {
        setCurrentJob(prev => prev ? { ...prev, progress: p, processedEvents: Math.floor((p/100) * numEvents) } : null);
      }
    }, 400);
  };

  const exportData = (format: 'csv' | 'parquet') => {
    // Parquet is mocked by generating a dummy .parquet blob download
    const activeKeys = Object.keys(featureTypes).filter(k => featureTypes[k]);
    const headers = ['EventID', 'Station', 'Quality', ...activeKeys.map(k => FEATURE_LABELS[k])];
    
    const content = [
      headers.join(','),
      ...features.map(f => [
        f.eventId, f.station, f.quality,
        ...activeKeys.map(k => (f as any)[k])
      ].join(','))
    ].join('\n');
    
    const blobType = format === 'csv' ? 'text/csv' : 'application/octet-stream';
    const blob = new Blob([content], { type: blobType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset_features.${format}`;
    a.click();
    setShowExport(false);
  };

  // Compute dummy correlation matrix strictly for selected features
  const correlationData = useMemo(() => {
    const keys = Object.keys(featureTypes).filter(k => featureTypes[k]);
    const labels = keys.map(k => FEATURE_LABELS[k]);
    const z = keys.map((rowKey, i) => {
      return keys.map((colKey, j) => {
        if (i === j) return 1.0;
        // Mock some specific correlations
        if ((rowKey === 'magnitude' && colKey === 'energy') || (rowKey === 'energy' && colKey === 'magnitude')) return 0.85;
        if ((rowKey === 'snr' && colKey === 'peakAmplitude') || (rowKey === 'peakAmplitude' && colKey === 'snr')) return 0.76;
        return parseFloat((Math.random() * 0.4 * (Math.random() > 0.5 ? 1 : -1)).toFixed(2));
      });
    });
    return { z, x: labels, y: labels };
  }, [featureTypes]);

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 rounded-2xl shadow-xl p-8 text-white flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center text-3xl">
            <FontAwesomeIcon icon={faBrain} className="text-purple-300" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Laboratoire IA / Feature Engineering</h1>
            <p className="text-purple-200 mt-1 font-medium">Pipeline Medallion et extraction pour modèles de Machine Learning</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: CONFIGURATION CARD */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                <FontAwesomeIcon icon={faCog} className="text-slate-400" /> Paramètres d'Extraction
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Couche Medallion Cible</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['Bronze', 'Silver', 'Gold'].map(layer => (
                      <button 
                        key={layer}
                        onClick={() => setSelectedLayer(layer as any)}
                        className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${selectedLayer === layer ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {layer}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Taille du Dataset (Événements)</label>
                  <input
                    type="number" value={targetEvents} onChange={(e) => setTargetEvents(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sélection des Features (Vecteur X)</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 h-[200px] overflow-y-auto">
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-5 h-5">
                          <input 
                            type="checkbox" 
                            checked={featureTypes[key]} 
                            onChange={(e) => setFeatureTypes(prev => ({...prev, [key]: e.target.checked}))}
                            className="peer w-5 h-5 opacity-0 absolute cursor-pointer"
                          />
                          <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors"></div>
                          {featureTypes[key] && <FontAwesomeIcon icon={faCheckCircle} className="absolute text-white text-xs" />}
                        </div>
                        <span className={`text-sm font-semibold transition-colors ${featureTypes[key] ? 'text-indigo-900' : 'text-slate-600 group-hover:text-slate-800'}`}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startJob}
                  disabled={currentJob?.status === 'running'}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold tracking-wide hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md shadow-indigo-200 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={currentJob?.status === 'running' ? faCog : faPlay} className={currentJob?.status === 'running' ? 'animate-spin' : ''} />
                  {currentJob?.status === 'running' ? 'Traitement Spark en cours...' : 'Lancer le Pipeline Feature'}
                </button>
              </div>
            </div>

             {/* Job Status Card */}
            {currentJob && (
              <div className="bg-indigo-900 rounded-2xl shadow-sm text-white p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/20">
                  <div className="h-full bg-green-400 transition-all duration-300" style={{width: `${currentJob.progress}%`}}></div>
                </div>
                <h3 className="font-bold mb-1">Job d'extraction #{currentJob.id.slice(-6)}</h3>
                <p className="text-indigo-200 text-sm mb-4">Couche : {currentJob.layer}</p>
                <div className="flex justify-between items-end">
                  <div className="text-3xl font-black font-mono">{currentJob.progress.toFixed(0)}%</div>
                  <div className="text-sm font-medium text-indigo-300">{currentJob.processedEvents} / {currentJob.totalEvents} evt</div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: DATA PREVIEW & ANALYSIS */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Toolbar Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
               <div className="flex gap-3">
                 <button onClick={() => setShowCorrelation(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                   <FontAwesomeIcon icon={faProjectDiagram} /> Afficher la Matrice de Corrélation
                 </button>
               </div>
               
               <button onClick={() => setShowExport(true)} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition shadow-sm">
                 <FontAwesomeIcon icon={faDownload} /> Exporter le Dataset
               </button>
            </div>

            {/* Data Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-grow flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FontAwesomeIcon icon={faDatabase} className="text-slate-400" /> Prévisualisation du Dataset ({features.length} lignes)
                </h2>
              </div>
              <div className="overflow-x-auto flex-grow h-[500px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-widest text-[10px]">Station</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-widest text-[10px]">Qualité</th>
                      {Object.keys(featureTypes).filter(k => featureTypes[k]).map(key => (
                        <th key={key} className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-widest text-[10px] bg-indigo-50/50">
                          {FEATURE_LABELS[key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {features.map((f, i) => (
                      <tr key={f.eventId + i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{f.station}</td>
                        <td className="px-4 py-3">
                          {f.quality === 'Gold' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">🥇 GOLD</span>}
                          {f.quality === 'Silver' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">🥈 SILVER</span>}
                          {f.quality === 'Bronze' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">🥉 BRONZE</span>}
                        </td>
                        {Object.keys(featureTypes).filter(k => featureTypes[k]).map(key => (
                          <td key={key} className="px-4 py-3 font-mono text-slate-600">
                            {(f as any)[key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Correlation Modal */}
      {showCorrelation && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                 <FontAwesomeIcon icon={faProjectDiagram} className="text-blue-600" /> Matrice de Corrélation de Pearson
               </h2>
               <button onClick={() => setShowCorrelation(false)} className="text-slate-400 hover:text-slate-800 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200"><FontAwesomeIcon icon={faTimes}/></button>
             </div>
             <div className="p-6 h-[500px]">
                {Object.keys(featureTypes).filter(k=>featureTypes[k]).length < 2 ? (
                  <div className="h-full flex items-center justify-center text-slate-400">Sélectionnez au moins 2 features pour voir les corrélations.</div>
                ) : (
                  <Plot
                    data={[{
                      z: correlationData.z,
                      x: correlationData.x,
                      y: correlationData.y,
                      type: 'heatmap',
                      colorscale: 'RdBu',
                      zmin: -1, zmax: 1,
                      hoverongaps: false
                    }]}
                    layout={{
                      margin: { t: 20, l: 120, b: 80, r: 20 },
                      xaxis: { tickangle: -45 },
                      autosize: true
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
             </div>
             <div className="p-4 bg-blue-50 text-blue-800 text-sm border-t border-blue-100">
               💡 <strong>Astuce ML :</strong> Les caractéristiques fortement corrélées (carrés rouge foncé ou bleu foncé hors diagonale) doivent être surveillées pour éviter la multicollinéarité dans vos modèles d'apprentissage profond.
             </div>
           </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h2 className="font-bold text-slate-800 text-lg">Format d'exportation</h2>
               <button onClick={() => setShowExport(false)} className="text-slate-400 hover:text-slate-800 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200"><FontAwesomeIcon icon={faTimes}/></button>
             </div>
             <div className="p-6 grid grid-cols-2 gap-4">
                <button onClick={() => exportData('csv')} className="border-2 border-slate-200 rounded-xl p-6 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center group">
                  <FontAwesomeIcon icon={faFileCsv} className="text-4xl text-slate-400 group-hover:text-emerald-500 mb-3" />
                  <h3 className="font-bold text-slate-800 mb-1">Fichier CSV</h3>
                  <p className="text-xs text-slate-500">Pour Excel, Pandas, et analyse visuelle rapide.</p>
                </button>
                <button onClick={() => exportData('parquet')} className="border-2 border-slate-200 rounded-xl p-6 hover:border-purple-500 hover:bg-purple-50 transition-all text-center group">
                  <FontAwesomeIcon icon={faFileCode} className="text-4xl text-slate-400 group-hover:text-purple-500 mb-3" />
                  <h3 className="font-bold text-slate-800 mb-1">Apache Parquet</h3>
                  <p className="text-xs text-slate-500">Optimisé pour TensorFlow, PyTorch et pipelines Big Data.</p>
                </button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
}
