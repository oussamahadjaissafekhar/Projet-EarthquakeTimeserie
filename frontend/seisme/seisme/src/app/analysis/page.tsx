/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import of our Plotly wrapper (uses plotly.js-dist-min under the hood)
const Plot = dynamic(() => import('../components/PlotlyChart'), { ssr: false });


// ── Types ─────────────────────────────────────────────────────────────────────
interface GoldEvent {
  station: string;
  window_id: string;
  day: string;
  hour: number;
  lat: number;
  lon: number;
  depth: number;
  window_start: string;
  window_end: string;
  start_time_utc: string;
  signal_unit: string;
  sampling_rate_ds: number;
  mean_amplitude: number;
  std_dev_amplitude: number | null;
  count_peaks: number;
  mag: number;
}

interface ProcessedWaveform {
  station: string;
  window_id: string;
  window_start: string;
  window_end: string;
  start_time_utc: string;
  signal_unit: string;
  sampling_rate_ds: number;
  mean_amplitude: number;
  std_dev_amplitude: number | null;
  count_peaks: number;
  mag: number;
  filter_applied: boolean;
  scipy_available: boolean;
  z_score_event: number;
  time_seconds: number[];
  waveform_zscore: number[];
  n_samples: number;
}

interface RelatedEvent {
  station: string;
  window_id: string;
  window_start: string;
  mean_amplitude: number;
  std_dev_amplitude: number | null;
  mag: number;
  lat: number;
  lon: number;
}


// ── Helpers ───────────────────────────────────────────────────────────────────
/** Convert amplitude (m) → microns (µm). Returns formatted string. */
function toMicron(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return 'N/A';
  const um = val * 1e6;
  if (um < 0.001) return `${(um * 1000).toFixed(2)} nm`;
  if (um < 1) return `${um.toFixed(4)} µm`;
  return `${um.toFixed(3)} µm`;
}

function ZScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null || !Number.isFinite(score)) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">N/A</span>;
  }
  if (score > 10) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Z={score.toFixed(1)} 🔴</span>;
  if (score > 5)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Z={score.toFixed(1)} 🟡</span>;
  return           <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Z={score.toFixed(1)} 🟢</span>;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Page Component ─────────────────────────────────────────────────────────────
export default function AnalysisPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Events list
  const [events, setEvents] = useState<GoldEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Studio state
  const [selectedEvent, setSelectedEvent] = useState<GoldEvent | null>(null);
  const [waveform, setWaveform] = useState<ProcessedWaveform | null>(null);
  const [loadingWaveform, setLoadingWaveform] = useState(false);

  // Comparison state
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [selectedRelatedId, setSelectedRelatedId] = useState<string>('');
  const [relatedWaveform, setRelatedWaveform] = useState<ProcessedWaveform | null>(null);

  // Filters
  const [year, setYear] = useState('2001');
  const [maxDepth, setMaxDepth] = useState('');
  const [minMag, setMinMag] = useState('4.0');

  // Signal processing options
  const [bandpass, setBandpass] = useState(false);
  const [lowcut, setLowcut] = useState(0.5);
  const [highcut, setHighcut] = useState(10.0);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setIsLoggedIn(true);
    setLoading(false);
  }, [router]);

  // ── Fetch Events ─────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (year) params.append('year', year);
      if (maxDepth) params.append('max_depth', maxDepth);
      if (minMag) params.append('min_mag', minMag);
      const res = await fetch(`http://${window.location.hostname}:8000/gold/events?${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); }
    finally { setLoadingEvents(false); }
  }, [year, maxDepth, minMag]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchEvents();
  }, [isLoggedIn, fetchEvents]);

  // ── Fetch Waveform ────────────────────────────────────────────────────────
  const fetchWaveform = useCallback(async (ev: GoldEvent) => {
    setSelectedEvent(ev);
    setSelectedRelatedId('');
    setRelatedWaveform(null);
    setLoadingWaveform(true);
    setWaveform(null);
    try {
      const params = new URLSearchParams({
        window_id: ev.window_id,
        bandpass: String(bandpass),
        lowcut: String(lowcut),
        highcut: String(highcut),
      });
      const res = await fetch(`http://${window.location.hostname}:8000/gold/waveform-processed?${params}`);
      const data = await res.json();
      if (data.error) { console.error(data.error); setWaveform(null); }
      else setWaveform(data);
      
      // Fetch related events
      const relParams = new URLSearchParams({
        window_start: ev.window_start,
        station: ev.station
      });
      fetch(`http://${window.location.hostname}:8000/api/events/related?${relParams}`)
         .then(r => r.json())
         .then(relatedData => setRelatedEvents(Array.isArray(relatedData) ? relatedData : []))
         .catch(e => console.error(e));
         
    } catch { setWaveform(null); }
    finally { setLoadingWaveform(false); }
  }, [bandpass, lowcut, highcut]);

  // ── Fetch Related Waveform ──────────────────────────────────────────────────
  const fetchRelatedWaveform = useCallback(async (wid: string) => {
    if (!wid) {
      setRelatedWaveform(null);
      return;
    }
    try {
      const params = new URLSearchParams({
        window_id: wid,
        bandpass: String(bandpass),
        lowcut: String(lowcut),
        highcut: String(highcut),
      });
      const res = await fetch(`http://${window.location.hostname}:8000/gold/waveform-processed?${params}`);
      const data = await res.json();
      if (!data.error) setRelatedWaveform(data);
    } catch { setRelatedWaveform(null); }
  }, [bandpass, lowcut, highcut]);

  // Re-process when filter settings change while event is selected
  useEffect(() => {
    if (selectedEvent) fetchWaveform(selectedEvent);
    if (selectedRelatedId) fetchRelatedWaveform(selectedRelatedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandpass, lowcut, highcut]);

  // ── Plotly data ───────────────────────────────────────────────────────────
  const plotData = useMemo(() => {
    if (!waveform?.time_seconds?.length) return null;
    const traces: any[] = [{
      type: 'scatter',
      mode: 'lines',
      x: waveform.time_seconds,
      y: waveform.waveform_zscore,
      name: `${waveform.station}`,
      line: {
        color: bandpass ? '#10b981' : '#3b82f6',
        width: 1.5,
      },
      hovertemplate: '<b>t=%{x:.2f}s</b><br>Z=%{y:.3f}<extra></extra>',
    }];

    if (relatedWaveform?.time_seconds?.length) {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: relatedWaveform.time_seconds,
        y: relatedWaveform.waveform_zscore,
        name: `${relatedWaveform.station}`,
        line: {
          color: '#f59e0b', // orange
          width: 1.5,
        },
        hovertemplate: '<b>t=%{x:.2f}s</b><br>Z=%{y:.3f}<extra></extra>',
      });
    }

    return traces;
  }, [waveform, relatedWaveform, bandpass]);

  // ── Loading / Auth guard ──────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-blue-900">
      <div className="text-white text-xl animate-pulse">Chargement du Studio...</div>
    </div>
  );
  if (!isLoggedIn) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-5">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-700 rounded-2xl shadow-xl p-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="text-blue-300">〜</span> Studio d&apos;Analyse de Signal
            </h1>
            <p className="text-blue-200 mt-1 text-sm">
              Sélectionnez un événement · analysez sa signature fréquentielle et temporelle
            </p>
          </div>
          <div className="text-right text-blue-200 text-xs">
            <div className="font-mono text-2xl">{events.length}</div>
            <div>événements</div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Filtres de Recherche</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Année</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: 2024"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Magnitude minimale</label>
              <input
                type="number" step="0.1" value={minMag}
                onChange={(e) => setMinMag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: 4.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Profondeur max (km)</label>
              <input
                type="number" value={maxDepth}
                onChange={(e) => setMaxDepth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Illimité"
              />
            </div>
          </div>
          <button
            onClick={fetchEvents}
            disabled={loadingEvents}
            className="mt-4 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loadingEvents ? '⏳ Chargement...' : '🔍 Rechercher'}
          </button>
        </div>

        {/* ── Events Table ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
              Événements Détectés — {events.length} résultats
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Station</th>
                  <th className="px-4 py-3 text-left font-semibold">Heure UTC</th>
                  <th className="px-4 py-3 text-left font-semibold">Amplitude</th>
                  <th className="px-4 py-3 text-left font-semibold">Magnitude</th>
                  <th className="px-4 py-3 text-left font-semibold">Prof. (km)</th>
                  <th className="px-4 py-3 text-left font-semibold">Z-Score</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Aucun événement. Ajustez vos filtres ou relancez le pipeline Spark.
                    </td>
                  </tr>
                ) : events.map((ev) => {
                  const isActive = selectedEvent?.window_id === ev.window_id;
                  // Z-score approximation: amplitude / std_dev
                  const zScore = ev.std_dev_amplitude && ev.std_dev_amplitude > 0
                    ? Math.abs(ev.mean_amplitude) / ev.std_dev_amplitude
                    : null;
                  return (
                    <tr
                      key={ev.window_id}
                      className={`transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">{ev.station}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                        {new Date(ev.window_start).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-700 font-mono">
                        {toMicron(ev.mean_amplitude)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                          {ev.mag?.toFixed(1) ?? 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ev.depth != null ? ev.depth.toFixed(2) : 'N/A'}
                      </td>
                      <td className="px-4 py-3"><ZScoreBadge score={zScore} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => fetchWaveform(ev)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all hover:scale-105 active:scale-95"
                        >
                          ▶ Analyser
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Studio ── */}
        {selectedEvent && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
            {/* Studio Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-white font-bold text-lg flex items-center gap-3">
                  📡 Studio — {selectedEvent.station}
                </h2>
                <p className="text-slate-300 text-xs font-mono mt-0.5">
                  {selectedEvent.window_id} · {new Date(selectedEvent.window_start).toISOString().slice(0, 19)} UTC
                </p>
                {relatedEvents.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-200">Comparer avec une autre station :</span>
                    <select
                      value={selectedRelatedId}
                      onChange={(e) => {
                        setSelectedRelatedId(e.target.value);
                        fetchRelatedWaveform(e.target.value);
                      }}
                      className="bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1.5 rounded outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="">-- Aucune sélection --</option>
                      {relatedEvents.map(re => {
                        const zsc = re.std_dev_amplitude ? (Math.abs(re.mean_amplitude) / re.std_dev_amplitude).toFixed(1) : 'N/A';
                        const dist = getDistanceKm(selectedEvent.lat, selectedEvent.lon, re.lat, re.lon);
                        return (
                          <option key={re.window_id} value={re.window_id}>
                            {re.station} · Z={zsc} · Dist: {dist.toFixed(0)} km
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-center">
                <div className="bg-slate-700/80 rounded-lg px-4 py-2 border border-slate-600">
                  <div className="text-blue-300 font-bold text-lg">{selectedEvent.mag?.toFixed(1)}</div>
                  <div className="text-slate-400 text-xs">Magnitude</div>
                </div>
                <div className="bg-slate-700/80 rounded-lg px-4 py-2 border border-slate-600">
                  <div className="text-green-300 font-bold text-lg font-mono">{toMicron(selectedEvent.mean_amplitude)}</div>
                  <div className="text-slate-400 text-xs">Amplitude moy.</div>
                </div>
                {waveform && (
                  <div className="bg-slate-700/80 rounded-lg px-4 py-2 border border-slate-600 flex flex-col justify-center items-center">
                    <ZScoreBadge score={waveform.z_score_event} />
                    <div className="text-slate-400 text-xs mt-1">Z-Score</div>
                  </div>
                )}
              </div>
            </div>

            {/* Signal Processing Controls */}
            <div className="px-6 py-4 border-b border-gray-100 bg-slate-50">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Traitement du Signal</h3>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={bandpass}
                      onChange={(e) => setBandpass(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${bandpass ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${bandpass ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Filtre Band-Pass</span>
                </label>
                {bandpass && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 font-semibold">Lowcut (Hz)</label>
                      <input
                        type="number" step="0.1" min="0.01" max="5" value={lowcut}
                        onChange={(e) => setLowcut(parseFloat(e.target.value))}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-black text-center font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 font-semibold">Highcut (Hz)</label>
                      <input
                        type="number" step="0.5" min="1" max="50" value={highcut}
                        onChange={(e) => setHighcut(parseFloat(e.target.value))}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-black text-center font-mono"
                      />
                    </div>
                  </>
                )}
                <div className="ml-auto text-xs text-gray-400">
                  {waveform && (
                    <>
                      <span className="font-mono">{waveform.n_samples} échantillons</span>
                      <span className="mx-2">·</span>
                      <span className="font-mono">{waveform.sampling_rate_ds?.toFixed(2)} Hz</span>
                      {waveform.filter_applied && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">BP Actif</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Waveform Plot */}
            <div className="p-6">
              {loadingWaveform ? (
                <div className="h-96 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="animate-spin text-4xl mb-3">⏳</div>
                    <p className="text-sm">Traitement du signal en cours...</p>
                  </div>
                </div>
              ) : plotData ? (
                <Plot
                  data={plotData}
                  layout={{
                    height: 400,
                    margin: { t: 20, r: 20, b: 60, l: 70 },
                    paper_bgcolor: 'white',
                    plot_bgcolor: '#f8fafc',
                    font: { family: 'Inter, sans-serif', size: 12 },
                    xaxis: {
                      title: { text: 'Temps (s)', font: { size: 13 } },
                      gridcolor: '#e2e8f0',
                      rangeslider: { visible: true, thickness: 0.05 },
                      showspikes: true,
                      spikecolor: '#94a3b8',
                      spikethickness: 1,
                    },
                    yaxis: {
                      title: { text: 'Amplitude (Z-score)', font: { size: 13 } },
                      gridcolor: '#e2e8f0',
                      zeroline: true,
                      zerolinecolor: '#cbd5e1',
                    },
                    hovermode: 'x unified',
                    showlegend: true,
                    legend: { orientation: 'h', y: -0.2, font: { size: 11 } },
                  }}
                  config={{
                    scrollZoom: true,
                    displayModeBar: true,
                    modeBarButtonsToRemove: ['select2d', 'lasso2d'],
                    responsive: true,
                    displaylogo: false,
                  }}
                  style={{ width: '100%' }}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-sm">Cliquez sur <strong>&quot;▶ Analyser&quot;</strong> pour visualiser la signature du signal</p>
                  </div>
                </div>
              )}

              {/* Metadata footer */}
              {waveform && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Unité Signal', value: waveform.signal_unit || 'counts' },
                    { label: 'Taux d\'échan.', value: `${waveform.sampling_rate_ds?.toFixed(2)} Hz` },
                    { label: `Max ${waveform.station}`, value: toMicron(waveform.mean_amplitude) },
                    { label: 'Filtre appliqué', value: waveform.filter_applied ? `BP ${lowcut}–${highcut} Hz` : 'Aucun' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-100 shadow-sm">
                      <div className="text-xs text-gray-500 font-semibold">{label}</div>
                      <div className="text-sm font-mono font-bold text-slate-800 mt-1">{value}</div>
                    </div>
                  ))}
                  
                  {relatedWaveform && selectedRelatedId && (() => {
                    const re = relatedEvents.find(x => x.window_id === selectedRelatedId);
                    const dist = re ? getDistanceKm(selectedEvent.lat, selectedEvent.lon, re.lat, re.lon) : 0;
                    return (
                      <>
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-100 shadow-sm">
                          <div className="text-xs text-orange-600 font-semibold">Comparaison</div>
                          <div className="text-sm font-bold text-orange-900 mt-1">{relatedWaveform.station}</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-100 shadow-sm">
                          <div className="text-xs text-orange-600 font-semibold">Dist / Z-Score</div>
                          <div className="text-sm font-mono font-bold text-orange-900 mt-1 flex gap-2 items-center">
                            {dist.toFixed(0)} km · <ZScoreBadge score={relatedWaveform.z_score_event} />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Placeholder if nothing selected yet */}
        {!selectedEvent && (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🎛️</div>
            <h3 className="text-lg font-semibold text-gray-600">Studio en attente</h3>
            <p className="text-gray-400 text-sm mt-2">
              Sélectionnez un événement dans la liste ci-dessus et cliquez sur <strong>&ldquo;▶ Analyser&rdquo;</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
