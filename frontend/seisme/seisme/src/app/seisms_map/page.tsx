'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import Layout from '../components/Layout';
import { useRouter } from 'next/navigation';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster').then(mod => mod.default as any), { ssr: false });

const getMagnitudeColor = (mag: number): string => {
  if (mag >= 6) return '#ef4444'; // Red
  if (mag >= 4) return '#f97316'; // Orange
  return '#eab308'; // Yellow
};

interface Seism {
  id: string;
  time: string;
  latitude: number;
  longitude: number;
  mag: number;
  place: string;
  depth: number;
}

export default function SeismMapPage() {
  const router = useRouter();
  const [seisms, setSeisms] = useState<Seism[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]); 
  
  // NLP Search
  const [searchQuery, setSearchQuery] = useState('');
  const [nlpInterpreted, setNlpInterpreted] = useState<any>(null);

  const loadData = async (query = '') => {
    setLoading(true);
    setNlpInterpreted(null);
    try {
      let url = `http://localhost:8000/seisms?page=1&limit=500`;
      
      if (query.trim() !== '') {
        url = `http://localhost:8000/api/search/natural?query=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      const quakes = Array.isArray(data?.data) ? (data.data as Seism[]) : [];

      if (data.interpreted) {
        setNlpInterpreted(data.interpreted);
      }

      if (quakes.length > 0 && query.trim() !== '') {
        setMapCenter([quakes[0].latitude, quakes[0].longitude]);
      }

      setSeisms(quakes);
    } catch (err) {
      console.error('Failed to load seisms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery);
  };

  return (
    <Layout>
      <div className="relative h-[calc(100vh-80px)] w-full bg-gray-100 flex flex-col">
        
        {/* CARTE EN PLEIN ÉCRAN */}
        <div className="flex-1 relative w-full h-full z-0">
          {loading && (
            <div className="absolute inset-0 z-[1000] bg-white/50 flex items-center justify-center backdrop-blur-sm">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
            </div>
          )}
          
          <MapContainer
            center={mapCenter}
            zoom={3}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
            />
            
            {/* @ts-ignore */}
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
              showCoverageOnHover={false}
            >
              {seisms.map(quake => {
                if (typeof quake.latitude !== 'number' || typeof quake.longitude !== 'number') return null;

                const magColor = getMagnitudeColor(quake.mag);
                const radius = Math.max(5, Math.min(20, quake.mag * 2.5));

                return (
                  <CircleMarker
                    key={quake.id}
                    center={[quake.latitude, quake.longitude]}
                    radius={radius}
                    fillColor={magColor}
                    color="#ffffff"
                    weight={1.5}
                    opacity={1}
                    fillOpacity={0.8}
                  >
                    <Popup className="quake-popup rounded-xl">
                      <div className="p-2 space-y-3 min-w-[220px]">
                        <div className="flex justify-between items-center border-b pb-2">
                          <h3 className="font-extrabold text-lg text-gray-800 m-0 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full inline-block" style={{backgroundColor: magColor}}></span>
                            M {quake.mag}
                          </h3>
                        </div>
                        <div className="space-y-1.5 text-sm text-gray-700">
                          <p className="flex justify-between items-start">
                            <span className="font-medium text-gray-500 mr-4">Région</span>
                            <span className="font-bold text-right text-indigo-700 leading-tight">{quake.place}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="font-medium text-gray-500">Profondeur</span>
                            <span className="font-semibold">{quake.depth} km</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="font-medium text-gray-500">Date exacte</span>
                            <span className="font-semibold">{new Date(quake.time).toLocaleString('fr-FR')}</span>
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        {/* BARRE DE RECHERCHE FLOTTANTE */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-3xl z-[1000] px-4 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 border border-gray-100 pointer-events-auto">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-black text-gray-800 tracking-tight">Observatoire Mondial des Séismes</h1>
            </div>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: 'Séismes de magnitude > 5 en Asie l'année dernière'"
                className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-gray-700 shadow-inner"
              />
              <button 
                type="submit" 
                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 font-bold transition-all"
              >
                Rechercher
              </button>
            </form>

            {nlpInterpreted && (Object.values(nlpInterpreted).some(x => x !== null)) && (
              <div className="mt-3 flex gap-2 items-center text-xs font-bold text-indigo-700">
                <span className="text-gray-500 font-medium">Filtres NLP :</span> 
                {nlpInterpreted.min_magnitude && <span className="bg-indigo-50 border border-indigo-100 rounded-md px-2.5 py-1">M ≥ {nlpInterpreted.min_magnitude}</span>}
                {nlpInterpreted.place && <span className="bg-indigo-50 border border-indigo-100 rounded-md px-2.5 py-1">Lieu : {nlpInterpreted.place}</span>}
                {nlpInterpreted.year && <span className="bg-indigo-50 border border-indigo-100 rounded-md px-2.5 py-1">Année : {nlpInterpreted.year}</span>}
              </div>
            )}
          </div>
        </div>

        {/* LÉGENDE INTÉGRÉE (En bas à droite) */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 border border-gray-100">
          <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Magnitudes</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500 border border-white shadow-sm"></div>
              <span className="text-sm font-bold text-gray-700">Majeur (&gt; 6.0)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-orange-500 border border-white shadow-sm"></div>
              <span className="text-sm font-bold text-gray-700">Modéré (4.0 - 6.0)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-yellow-500 border border-white shadow-sm"></div>
              <span className="text-sm font-bold text-gray-700">Mineur (&lt; 4.0)</span>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}