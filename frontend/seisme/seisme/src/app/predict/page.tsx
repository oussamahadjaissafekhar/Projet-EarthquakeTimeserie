'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBrain, faPlayCircle, faChartArea, faTable, faSyncAlt,
  faExclamationTriangle, faCheckCircle, faSpinner, faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';

// ── Leaflet components (SSR-safe) ──────────────────────────────────────────
const MapContainer   = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer      = dynamic(() => import('react-leaflet').then(m => m.TileLayer),     { ssr: false });
const CircleMarker   = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Popup          = dynamic(() => import('react-leaflet').then(m => m.Popup),         { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────
interface PredResult {
  latitude: number;
  longitude: number;
  magnitude: number;
  risk_pct: number;
  sequence: number[];   // only for LSTM
}

interface Metrics { RMSE: number | null; MAE: number | null; }

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function riskColor(pct: number) {
  if (pct >= 70) return '#dc2626'; // red
  if (pct >= 40) return '#f97316'; // orange
  return '#eab308';                // yellow
}

function riskLabel(pct: number) {
  if (pct >= 70) return { label: 'Élevé',   bg: 'bg-red-100',    text: 'text-red-700'   };
  if (pct >= 40) return { label: 'Modéré',  bg: 'bg-orange-100', text: 'text-orange-700' };
  return              { label: 'Faible',  bg: 'bg-yellow-100', text: 'text-yellow-700' };
}

export default function PredictPage() {
  // ── States ───────────────────────────────────────────────────────────────
  const [modelType, setModelType] = useState<'RF' | 'LSTM'>('RF');
  const [annee, setAnnee]         = useState(2010);
  const [mois,  setMois]          = useState(6);
  const [threshold, setThreshold] = useState(0.3);

  const [rfMetrics,   setRfMetrics]   = useState<Metrics | null>(null);
  const [lstmMetrics, setLstmMetrics] = useState<Metrics | null>(null);
  const [nSamples,    setNSamples]    = useState<number | null>(null);
  const [trained,     setTrained]     = useState(false);

  const [results,     setResults]   = useState<PredResult[]>([]);
  const [selectedRow, setSelectedRow] = useState<PredResult | null>(null);

  const [training,   setTraining]  = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [trainMsg,   setTrainMsg]  = useState('');
  const [errMsg,     setErrMsg]    = useState('');

  const API_BASE = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000`
    : 'http://localhost:8000';

  // ── API Calls ────────────────────────────────────────────────────────────
  const handleTrain = useCallback(async () => {
    setTraining(true);
    setTrainMsg('');
    setErrMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/predict/train`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error || 'Erreur inconnue'); return; }
      setRfMetrics(data.rf);
      setLstmMetrics(data.lstm);
      setNSamples(data.n_samples);
      setTrained(true);
      setTrainMsg(`✅ Entraînement terminé sur ${data.n_samples} événements Gold`);
    } catch (e) {
      setErrMsg('API inaccessible. Vérifiez que le backend tourne sur :8000');
    } finally {
      setTraining(false);
    }
  }, [API_BASE]);

  const handlePredict = useCallback(async () => {
    if (!trained) { setErrMsg('Entraînez les modèles en premier !'); return; }
    setPredicting(true);
    setErrMsg('');
    setSelectedRow(null);
    try {
      const url = `${API_BASE}/api/predict/run?model_type=${modelType}&annee=${annee}&mois=${mois}&threshold=${threshold}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error || 'Erreur inconnue'); return; }
      setResults(data.results || []);
    } catch (e) {
      setErrMsg('Erreur lors de la prédiction');
    } finally {
      setPredicting(false);
    }
  }, [trained, modelType, annee, mois, threshold, API_BASE]);

  // ── Stats KPIs ────────────────────────────────────────────────────────────
  const highRisk = useMemo(() => results.filter(r => r.risk_pct >= 70).length, [results]);
  const medRisk  = useMemo(() => results.filter(r => r.risk_pct >= 40 && r.risk_pct < 70).length, [results]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">

          {/* ── Header ─────────────────────────────── */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center text-3xl">
                <FontAwesomeIcon icon={faBrain} className="text-indigo-300" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Dashboard de Prédiction IA</h1>
                <p className="text-slate-300 text-sm mt-1">Random Forest Statistique vs LSTM Temporel — couche Gold</p>
              </div>
            </div>
            <button
              onClick={handleTrain}
              disabled={training}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg disabled:opacity-60"
            >
              <FontAwesomeIcon icon={training ? faSpinner : faPlayCircle} className={training ? 'animate-spin' : ''} />
              {training ? 'Entraînement…' : 'Lancer l\'entraînement'}
            </button>
          </div>

          {/* ── Messages ──────────────────────────── */}
          {trainMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-2 font-semibold"><FontAwesomeIcon icon={faCheckCircle}/> {trainMsg}</div>}
          {errMsg   && <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center gap-2 font-semibold"><FontAwesomeIcon icon={faExclamationTriangle}/> {errMsg}</div>}

          {/* ── Model Metrics ──────────────────────── */}
          {(rfMetrics || lstmMetrics) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* RF Card */}
              <div className={`bg-white rounded-2xl border-2 p-5 transition ${modelType === 'RF' ? 'border-indigo-500 shadow-indigo-100 shadow-md' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Modèle Statistique</div>
                    <div className="text-lg font-black text-slate-800">Random Forest</div>
                    <div className="text-xs text-slate-500 mt-0.5">500 arbres — Régression sur positions uniques</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg">🌲</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-indigo-700">{rfMetrics?.RMSE ?? '—'}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase mt-0.5">RMSE</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-indigo-700">{rfMetrics?.MAE ?? '—'}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase mt-0.5">MAE</div>
                  </div>
                </div>
              </div>
              
              {/* LSTM Card */}
              <div className={`bg-white rounded-2xl border-2 p-5 transition ${modelType === 'LSTM' ? 'border-purple-500 shadow-purple-100 shadow-md' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Modèle Temporel</div>
                    <div className="text-lg font-black text-slate-800">LSTM (PyTorch)</div>
                    <div className="text-xs text-slate-500 mt-0.5">Séquences de 5 — 2 couches cachées 64 neurones</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-black text-lg">⏱</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-purple-700">{lstmMetrics?.RMSE ?? '—'}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase mt-0.5">RMSE</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-purple-700">{lstmMetrics?.MAE ?? '—'}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase mt-0.5">MAE</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Controls ───────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-widest">Paramètres de Prédiction</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              
              {/* Toggle RF / LSTM */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modèle</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setModelType('RF')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${modelType === 'RF' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>
                    🌲 RF
                  </button>
                  <button onClick={() => setModelType('LSTM')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${modelType === 'LSTM' ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>
                    ⏱ LSTM
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Année</label>
                <input type="number" value={annee} onChange={e => setAnnee(+e.target.value)} min={2000} max={2018}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mois</label>
                <select value={mois} onChange={e => setMois(+e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none">
                  {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>

              <button onClick={handlePredict} disabled={predicting || !trained}
                className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition disabled:opacity-50 shadow-sm">
                <FontAwesomeIcon icon={predicting ? faSpinner : faSyncAlt} className={predicting ? 'animate-spin' : ''} />
                {predicting ? 'Calcul…' : 'Prédire'}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <>
              {/* ── KPI Summary ───── */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
                  <div className="text-3xl font-black text-slate-800">{results.length}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase mt-1">Zones prédites</div>
                </div>
                <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4 text-center">
                  <div className="text-3xl font-black text-red-600">{highRisk}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase mt-1">Risque élevé ≥ 70%</div>
                </div>
                <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-4 text-center">
                  <div className="text-3xl font-black text-orange-500">{medRisk}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase mt-1">Risque modéré 40-70%</div>
                </div>
              </div>

              {/* ── Map + Table ──── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Map */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[500px] flex flex-col">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FontAwesomeIcon icon={faChartArea} className="text-slate-400" />
                    Carte des Risques — {modelType === 'RF' ? 'Random Forest' : 'LSTM'} — {MONTHS[mois-1]} {annee}
                  </div>
                  <div className="flex-grow relative z-0">
                    <MapContainer center={[23, 97]} zoom={5} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
                      {results.map((r, i) => (
                        <CircleMarker
                          key={i}
                          center={[r.latitude, r.longitude]}
                          radius={Math.max(6, r.risk_pct / 10)}
                          pathOptions={{ color: riskColor(r.risk_pct), fillColor: riskColor(r.risk_pct), fillOpacity: 0.6, weight: 1 }}
                          eventHandlers={{ click: () => setSelectedRow(r) }}
                        >
                          <Popup>
                            <div className="text-center min-w-[140px]">
                              <div className="font-bold text-slate-800 mb-1">Zone de Risque</div>
                              <div className="text-2xl font-black" style={{color: riskColor(r.risk_pct)}}>{r.risk_pct}%</div>
                              <div className="text-xs text-slate-500 mt-1">Magnitude prédite : <strong>{r.magnitude}</strong></div>
                              <div className="text-xs text-slate-500">[{r.latitude}, {r.longitude}]</div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </div>
                </div>

                {/* Right panel: Table + LSTM sequence */}
                <div className="lg:col-span-5 flex flex-col gap-4">

                  {/* LSTM Sequence Chart (only when LSTM + row selected) */}
                  {modelType === 'LSTM' && selectedRow && selectedRow.sequence.length > 0 && (
                    <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                          Séquence LSTM — 5 derniers événements
                        </div>
                        <FontAwesomeIcon icon={faInfoCircle} className="text-purple-400 text-xs" />
                      </div>
                      <div className="text-xs text-slate-500 mb-2 font-mono">Position : [{selectedRow.latitude}, {selectedRow.longitude}]</div>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={selectedRow.sequence.map((m, i) => ({ t: `t-${selectedRow.sequence.length - i}`, mag: m }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="t" tick={{fontSize:11, fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize:11, fill:'#94a3b8'}} axisLine={false} tickLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                          <Tooltip formatter={(v: any) => [`${v} Mw`, 'Magnitude']} />
                          <ReferenceLine y={selectedRow.magnitude} stroke="#a855f7" strokeDasharray="4 4"
                            label={{ value: `Prédit: ${selectedRow.magnitude}`, fill: '#7c3aed', fontSize: 11, position: 'insideTopRight' }} />
                          <Line type="monotone" dataKey="mag" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden flex-grow max-h-[400px]">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2">
                      <FontAwesomeIcon icon={faTable} className="text-slate-400" /> Résultats ({results.length})
                    </div>
                    <div className="overflow-y-auto flex-grow">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0 text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                          <tr>
                            <th className="px-3 py-2 text-left">Lat</th>
                            <th className="px-3 py-2 text-left">Lon</th>
                            <th className="px-3 py-2 text-left">Mag.</th>
                            <th className="px-3 py-2 text-left">Risque</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {results.map((r, i) => {
                            const lvl = riskLabel(r.risk_pct);
                            return (
                              <tr key={i}
                                onClick={() => setSelectedRow(r)}
                                className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedRow === r ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''}`}>
                                <td className="px-3 py-2 font-mono text-slate-600">{r.latitude}</td>
                                <td className="px-3 py-2 font-mono text-slate-600">{r.longitude}</td>
                                <td className="px-3 py-2 font-bold text-slate-800">{r.magnitude}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${lvl.bg} ${lvl.text}`}>
                                    {r.risk_pct}% {lvl.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Empty State ─── */}
          {results.length === 0 && !predicting && trained && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
              <FontAwesomeIcon icon={faChartArea} className="text-5xl mb-4" />
              <p className="font-semibold">Aucun résultat — ajustez le seuil ou la période et relancez la prédiction.</p>
            </div>
          )}

          {!trained && !training && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-8 text-center">
              <FontAwesomeIcon icon={faInfoCircle} className="text-3xl text-indigo-400 mb-3" />
              <h3 className="text-lg font-bold text-indigo-800 mb-2">Commencez par entraîner les modèles</h3>
              <p className="text-indigo-600 font-medium text-sm max-w-md mx-auto">
                Cliquez sur &quot;Lancer l'entraînement&quot; en haut de la page. 
                Les deux modèles (Random Forest &amp; LSTM) seront entraînés sur les données de la couche Gold.
                Cela prend environ 30–60 secondes selon le volume de données.
              </p>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
