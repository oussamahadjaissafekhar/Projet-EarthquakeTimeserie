'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Brush
} from 'recharts';
import Layout from '../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faChartLine, faSatelliteDish, faWaveSquare, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface StlDataPoint {
  date: string;
  observed: number;
  trend: number;
  seasonal: number;
  resid: number;
}

export default function AuditQualityPage() {
  const [stlData, setStlData] = useState<StlDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [stationMode, setStationMode] = useState('Global Network');
  
  // Dummy list of typical SE Asia stations
  const STATIONS = ['Global Network', 'KRIS', 'UGM', 'JD05', 'BKNI', 'BNDI', 'TOLI'];

  const fetchStlData = async (station: string) => {
    setLoading(true);
    try {
      const p = station === 'Global Network' ? '' : `?station=${station}`;
      const res = await fetch(`http://${window.location.hostname}:8000/stl${p}`);
      const stl = await res.json();

      if (stl?.dates && Array.isArray(stl.dates)) {
        setStlData(stl.dates.map((date: string, i: number) => ({
          date,
          observed: stl.observed?.[i] || 0,
          trend: stl.trend?.[i] || 0,
          seasonal: stl.seasonal?.[i] || 0,
          resid: stl.resid?.[i] || 0,
        })));
      } else {
        setStlData([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setStlData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStlData(stationMode);
  }, [stationMode]);

  // Export residuals
  const handleExport = () => {
    const residuals = stlData.map(d => ({ date: d.date, resid_value: d.resid }));
    const blob = new Blob([JSON.stringify(residuals, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `residus-${stationMode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Calculate Standard Deviation of Resid to place +3 / -3 robustly
  const residStdDev = useMemo(() => {
    if (stlData.length === 0) return 3; // Fallback
    const mean = stlData.reduce((acc, v) => acc + v.resid, 0) / stlData.length;
    const sqDiff = stlData.reduce((acc, v) => acc + Math.pow(v.resid - mean, 2), 0);
    return Math.sqrt(sqDiff / stlData.length);
  }, [stlData]);

  const upperThreshold = residStdDev * 3;
  const lowerThreshold = -residStdDev * 3;

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8 px-4 max-w-7xl">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black mb-2 text-slate-800 tracking-tight flex items-center gap-3">
                <span className="text-blue-600">📊</span> Audit de Signal & Bruit de Fond (STL)
              </h1>
              <h2 className="text-lg font-semibold text-slate-500 mb-4">
                Analyse de la stabilité des capteurs et décomposition des cycles de bruit.
              </h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg text-slate-700 text-sm font-medium">
                &quot;La décomposition STL est utilisée ici pour auditer la qualité des données brutes. 
                Elle permet d&apos;isoler la <strong>Tendance</strong> (dérives du capteur), 
                la <strong>Saisonnalité</strong> (bruit anthropique cyclique) et 
                les <strong>Résidus</strong> (anomalies ponctuelles).&quot;
              </div>
            </div>
            
            <div className="flex flex-col gap-3 min-w-[250px]">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Capteur / Station cible
                </label>
                <select 
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                  value={stationMode}
                  onChange={(e) => setStationMode(e.target.value)}
                >
                  {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <button 
                onClick={handleExport}
                className="w-full flex justify-center items-center gap-2 bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
              >
                <FontAwesomeIcon icon={faDownload} /> Exporter les Résidus
              </button>
            </div>
          </div>
        </div>

        {/* Loading overlay if needed */}
        {loading && (
          <div className="w-full h-32 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-200">
            <span className="animate-pulse font-bold text-slate-400">Génération du profil de signal...</span>
          </div>
        )}

        {/* Charts Section */}
        {!loading && stlData.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            
            {/* 1. OBSERVED */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FontAwesomeIcon icon={faWaveSquare} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Signal Brut (Observé)</h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Acquisition directe du capteur</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stlData} syncId="stl-sync" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="observed" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 2. TREND */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <FontAwesomeIcon icon={faChartLine} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Tendance (Trend)</h3>
                </div>
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stlData} syncId="stl-sync" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" hide />
                      <YAxis tick={{fontSize: 11, fill: '#64748b'}} domain={['dataMin', 'dataMax']} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="trend" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-auto text-sm text-slate-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <strong className="text-emerald-800">Sert à détecter si le capteur dérive</strong> ou s&apos;il y a un changement tectonique lent.
                </p>
              </div>

              {/* 3. SEASONAL */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <FontAwesomeIcon icon={faSatelliteDish} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Saisonnalité (Seasonal)</h3>
                </div>
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stlData} syncId="stl-sync" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" hide />
                      <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="seasonal" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-auto text-sm text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <strong className="text-amber-800">Affiche les cycles répétitifs</strong> (ex: vibrations jour/nuit dues à l&apos;activité humaine ou thermique).
                </p>
              </div>
            </div>

            {/* 4. RESIDUAL */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Résidus (Anomalies)</h3>
                  <p className="text-xs text-rose-500 font-semibold uppercase tracking-wider">Seuils d&apos;activation à ± 3 Écarts-types</p>
                </div>
              </div>
              <div className="h-80 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stlData} syncId="stl-sync" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <ReferenceLine y={upperThreshold} stroke="#e11d48" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '+3σ', fill: '#e11d48', fontSize: 12, fontWeight: 'bold' }} />
                    <ReferenceLine y={lowerThreshold} stroke="#e11d48" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: '-3σ', fill: '#e11d48', fontSize: 12, fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="resid" stroke="#fb7185" strokeWidth={1} dot={false} isAnimationActive={false} />
                    <Brush dataKey="date" height={30} stroke="#94a3b8" fill="#f8fafc" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-slate-600 bg-rose-50 p-4 rounded-lg border border-rose-100">
                <strong className="text-rose-800">C&apos;est ici que l&apos;on isole les événements sismiques imprévisibles.</strong> 
                Tout pic dépassant les lignes pointillées rouges (± 3 écarts-types) représente une anomalie statistiquement significative par rapport au bruit de fond local, et mérite une attention pour le modèle de Machine Learning.
              </p>
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}
