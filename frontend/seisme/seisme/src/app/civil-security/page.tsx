'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faMapMarkerAlt, faChartLine, faBolt, faHospital, faSearch, faSyncAlt, faTimes, faExclamationTriangle, faUsers } from '@fortawesome/free-solid-svg-icons';
import 'leaflet/dist/leaflet.css';

// Fix Next.js Leaflet dynamic imports
const MapContainer = dynamic(() => import('react-leaflet').then(c => c.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(c => c.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(c => c.CircleMarker), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(c => c.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(c => c.Popup), { ssr: false });

// Simple L wrapper trick for custom icons without full module load error
const getL = () => {
  if (typeof window !== 'undefined') return require('leaflet');
  return null;
};

// ── Types ─────────────────────────────────────────────────────────────────
interface GoldEvent {
  station: string;
  window_id: string;
  day: string;
  hour: number;
  lat: number;
  lon: number;
  depth: number;
  window_start: string;
  mean_amplitude: number;
  mag: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getDangerLevel(mag: number) {
  if (mag >= 6) return { label: 'CRITIQUE', color: 'bg-red-600', text: 'text-white' };
  if (mag >= 4) return { label: 'ÉLEVÉ', color: 'bg-orange-500', text: 'text-white' };
  return { label: 'FAIBLE', color: 'bg-green-500', text: 'text-white' };
}

function getMercalli(mag: number): string {
  if (mag >= 8.0) return 'XII';
  if (mag >= 7.0) return 'X';
  if (mag >= 6.0) return 'VIII';
  if (mag >= 5.0) return 'VI';
  if (mag >= 4.0) return 'IV';
  if (mag >= 3.0) return 'II';
  return 'I';
}

function estimateZone(lat: number, lon: number): string {
  // Dummy logic: simply alternate or base on even/odd lat to simulate Population Zone
  return (lat + lon) % 2 > 1 ? 'Zone Urbaine (Haute Densité)' : 'Zone Isolée / Rurale';
}

function getImpactColor(mag: number) {
  if (mag >= 6) return '#dc2626'; // Red
  if (mag >= 4) return '#f97316'; // Orange
  return '#eab308'; // Yellow
}

export default function CivilSecurityDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [events, setEvents] = useState<GoldEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Custom queries
  const [searchQuery, setSearchQuery] = useState('');
  const [yearCode, setYearCode] = useState(''); // Pas de filtre année par défaut → charge les derniers événements
  const [advancedMinMag, setAdvancedMinMag] = useState<number>(0);
  
  // Modal for Fiche d'intervention
  const [activeFiche, setActiveFiche] = useState<GoldEvent | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      setIsLoggedIn(true);
      setLoading(false);
    }
  }, [router]);

  // NLP-ish parsing logic for search
  const parseSearch = (query: string) => {
    let y = '';
    let m = 0;
    const q = query.toLowerCase();
    
    // Attempt extracting year (e.g. "en 2026")
    const yearMatch = q.match(/(20\d{2})/);
    if (yearMatch) y = yearMatch[1];
    else if (q.includes('actuel') || q.includes('récent')) y = '2026';
    
    // Attempt extracting magnitude (e.g. "magnitude > 5", "mag > 4.5", "majeur")
    const magMatch = q.match(/mag[a-z]*\s*(?:>|=)?\s*(\d+(?:\.\d+)?)/);
    if (magMatch) m = parseFloat(magMatch[1]);
    else if (q.includes('critique') || q.includes('majeur')) m = 6.0;
    else if (q.includes('fort') || q.includes('élevé')) m = 4.0;
    
    setYearCode(y);
    setAdvancedMinMag(m);
  };

  const handleSearchCommit = (e: React.FormEvent) => {
    e.preventDefault();
    parseSearch(searchQuery);
    fetchData();
  };

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (yearCode && yearCode.length === 4) params.append('year', yearCode);
      if (advancedMinMag > 0) params.append('min_mag', advancedMinMag.toString());
      
      const res = await fetch(`http://${window.location.hostname}:8000/gold/events?${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setEvents([]);
    } finally {
      setRefreshing(false);
    }
  }, [yearCode, advancedMinMag]);

  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn, yearCode, advancedMinMag, fetchData]);

  // Derived KPIs
  const criticalEvents = useMemo(() => events.filter(e => e.mag >= 5.0), [events]);
  const avgMag = useMemo(() => events.length > 0 ? (events.reduce((a, b) => a + b.mag, 0) / events.length) : 0, [events]);
  
  const mostSolicitedStation = useMemo(() => {
    if (events.length === 0) return 'Aucune';
    const counts: Record<string, number> = {};
    let max = 0;
    let station = '';
    events.forEach(e => {
      counts[e.station] = (counts[e.station] || 0) + 1;
      if (counts[e.station] > max) { max = counts[e.station]; station = e.station; }
    });
    return `${station} (${max} alrts)`;
  }, [events]);

  const uniqueStations = useMemo(() => {
    const stmap = new Map<string, { lat: number, lon: number }>();
    events.forEach(e => { if (!stmap.has(e.station)) stmap.set(e.station, { lat: e.lat + (Math.random()*0.1-0.05), lon: e.lon + (Math.random()*0.1-0.05) }); }); // Shift station slightly for display
    return Array.from(stmap.entries()).map(([name, coords]) => ({ name, ...coords }));
  }, [events]);

  const L = getL();
  const stationIcon = L ? L.divIcon({
    html: '<div style="background-color:#2563eb; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
    className: '',
    iconSize: [12, 12]
  }) : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white animate-pulse">Initialisation du Dashboard de Crise...</div>;
  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar / Header Dashboard */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-xl flex flex-col md:flex-row items-center justify-between z-10 relative">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600 rounded-lg shadow-lg">
            <FontAwesomeIcon icon={faShieldAlt} className="text-2xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">QG Sécurité Civile</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Analyse d&apos;Alerte &amp; Impact</p>
          </div>
        </div>
        
        <form onSubmit={handleSearchCommit} className="mt-4 md:mt-0 relative w-full md:w-96">
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-slate-400"
            placeholder="Ex: Séismes majeurs en 2018, ou mag > 5"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-3 text-slate-400" />
        </form>
        
        <button 
          onClick={fetchData}
          disabled={refreshing}
          className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-sm font-semibold transition-all border border-slate-700"
        >
          <FontAwesomeIcon icon={faSyncAlt} className={refreshing ? 'animate-spin text-blue-400' : 'text-blue-400'} />
          Rafraîchir
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KPIs Row */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 border-l-4 border-l-red-500">
            <div className="bg-red-50 text-red-600 w-12 h-12 rounded-full flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Alertes Critiques (Mag {'>='} 5)</p>
              <p className="text-2xl font-black text-slate-800">{criticalEvents.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 border-l-4 border-l-orange-500">
            <div className="bg-orange-50 text-orange-600 w-12 h-12 rounded-full flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faChartLine} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Magnitude Moyenne</p>
              <p className="text-2xl font-black text-slate-800">{avgMag.toFixed(2)} Mw</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 border-l-4 border-l-blue-500">
            <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faBolt} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Réseau le plus impacté</p>
              <p className="text-xl font-black text-slate-800 tracking-tight">{mostSolicitedStation}</p>
            </div>
          </div>
        </div>

        {/* Left Column: Map */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-slate-400" />
              Cartographie Tactique d&apos;Impact
            </h2>
            <div className="flex gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Ressenti</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Dégâts mineurs</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600"></span> Majeur</span>
            </div>
          </div>
          <div className="flex-grow relative z-0">
             <MapContainer 
              center={[20, 40]} // Vue mondiale
              zoom={5} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                attribution="Esri, HERE, Garmin, NGA, USGS"
              />
              {/* Plot Stations */}
              {stationIcon && uniqueStations.map(st => (
                <Marker key={`st-${st.name}`} position={[st.lat, st.lon]} icon={stationIcon}>
                  <Popup><span className="font-bold text-blue-600">📡 Station: {st.name}</span></Popup>
                </Marker>
              ))}

              {/* Plot Earthquake Impact Circles */}
              {events.map((ev, i) => {
                const mapColor = getImpactColor(ev.mag);
                const radius = Math.max(8, ev.mag * 3);
                return (
                  <CircleMarker 
                    key={ev.window_id + i}
                    center={[ev.lat, ev.lon]}
                    pathOptions={{ color: mapColor, fillColor: mapColor, fillOpacity: 0.4, weight: 1 }}
                    radius={radius}
                  >
                    <Popup className="rounded-lg shadow-lg">
                      <div className="text-center">
                        <h3 className="font-bold text-slate-800 mb-1">Impact Estimé</h3>
                        <p className="text-xs mb-1">Magnitude: <strong className="text-lg" style={{color:mapColor}}>{ev.mag.toFixed(1)}</strong></p>
                        <p className="text-xs text-slate-500">{new Date(ev.window_start).toLocaleString('fr-FR')}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Right Column: Fiches d'Alerte */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <FontAwesomeIcon icon={faHospital} className="text-slate-400" />
              Fiches d&apos;Alerte Prioritaires
            </h2>
          </div>
          
          <div className="overflow-y-auto p-4 space-y-3 flex-grow bg-slate-50/50">
            {events.length === 0 ? (
              <p className="text-center text-slate-400 py-10">Aucun événement ne correspond aux critères.</p>
            ) : (
              events.slice(0, 100).map((ev) => {
                const danger = getDangerLevel(ev.mag);
                const zone = estimateZone(ev.lat, ev.lon);
                const mercalli = getMercalli(ev.mag);
                return (
                  <div key={ev.window_id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${danger.color} ${danger.text}`}>
                            RISQUE {danger.label}
                          </span>
                          <span className="text-xs font-mono text-slate-400">{new Date(ev.window_start).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <h3 className="font-bold text-slate-800">Épicentre [ {ev.lat.toFixed(2)}, {ev.lon.toFixed(2)} ]</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-800">{ev.mag.toFixed(1)}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Magnitude</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs mb-3">
                      <div className="bg-slate-50 p-2 rounded">
                        <div className="text-slate-400 font-semibold mb-0.5">Intensité Mercalli</div>
                        <div className="font-bold text-slate-700">{mercalli} (Estimée)</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <div className="text-slate-400 font-semibold mb-0.5">Zone d&apos;impact</div>
                        <div className="font-bold text-slate-700 flex items-center gap-1">
                          <FontAwesomeIcon icon={faUsers} className="text-slate-400" /> {zone}
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setActiveFiche(ev)}
                      className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                    >
                      Générer Fiche d&apos;Intervention
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Modal Fiche d'intervention */}
      {activeFiche && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className={`p-6 ${getDangerLevel(activeFiche.mag).color} text-white`}>
              <button onClick={() => setActiveFiche(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition">
                <FontAwesomeIcon icon={faTimes} />
              </button>
              <div className="text-xs font-bold uppercase opacity-80 tracking-widest mb-1">Rapport d&apos;Urgence — ORSEC</div>
              <h2 className="text-2xl font-black">Événement Sismique Majeur</h2>
              <p className="opacity-90 mt-1">{new Date(activeFiche.window_start).toLocaleString('fr-FR')} UTC</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <div className="text-xs text-slate-400 font-bold uppercase">Localisation</div>
                   <div className="font-mono font-semibold text-slate-800 mt-1">LAT: {activeFiche.lat}</div>
                   <div className="font-mono font-semibold text-slate-800">LON: {activeFiche.lon}</div>
                 </div>
                 <div>
                   <div className="text-xs text-slate-400 font-bold uppercase">Profondeur Focus</div>
                   <div className="font-bold text-slate-800 text-xl mt-1">{activeFiche.depth} km</div>
                 </div>
              </div>
              
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-700">Magnitude Richter</span>
                  <span className="text-2xl font-black text-red-600">{activeFiche.mag.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Intensité Mercalli Estimée</span>
                  <span className="text-xl font-black text-orange-600">{getMercalli(activeFiche.mag)}</span>
                </div>
              </div>
              
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase mb-2">Instructions aux secours</div>
                <ul className="text-sm font-medium text-slate-700 space-y-2 list-disc pl-4">
                  {activeFiche.mag >= 6 ? (
                    <>
                      <li className="text-red-600">Déploiement immédiat des équipes USAR (Recherche et Sauvetage en Milieu Urbain).</li>
                      <li>Risque d&apos;effondrement structurel critique. Couper gaz et électricité.</li>
                      <li>Alerte tsunami si zone côtière.</li>
                    </>
                  ) : activeFiche.mag >= 4 ? (
                    <>
                      <li>Inspection prioritaire des ponts et barrages.</li>
                      <li>Préparation des centres de regroupement pour population impactée.</li>
                    </>
                  ) : (
                    <>
                      <li>Alerte ressentie, faible probabilité de dégâts infrastructurels.</li>
                      <li>Communication de réassurance à la population recommandée.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => setActiveFiche(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
              >
                Fermer
              </button>
              <button 
                onClick={() => { window.print(); }}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm"
              >
                Imprimer le rapport
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
