// app/page.tsx or pages/index.tsx (Next.js)
'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter
} from 'recharts';
import Layout from '../components/Layout';

interface StlDataPoint {
  date: string;
  observed: number;
  trend: number;
  seasonal: number;
  resid: number;
}

interface ForecastDataPoint {
  date: string;
  value: number;
  type: string;
}

interface RfmDataPoint {
  client_id: any;
  recence: any;
  frequence: any;
  montant: any;
  cluster: any;
}

export default function Dashboard() {
  const [stlData, setStlData] = useState<StlDataPoint[]>([]);
  const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([]);
  const [rfmData, setRfmData] = useState<RfmDataPoint[]>([]);
  const [numbers, setNumbers] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stlRes = await fetch(`http://${window.location.hostname}:8000/stl`);
        const forecastRes = await fetch(`http://${window.location.hostname}:8000/predict`);
        const rfmRes = await fetch(`http://${window.location.hostname}:8000/rfm`);
        const numberRes = await fetch(`http://${window.location.hostname}:8000/numbers`);

        const stl = await stlRes.json();
        const forecast = await forecastRes.json();
        const rfm = await rfmRes.json();
        const nums = await numberRes.json();

        setNumbers(nums || {});

        if (stl?.dates && Array.isArray(stl.dates)) {
          setStlData(stl.dates.map((date: string, i: number) => ({
            date,
            observed: stl.observed?.[i] || 0,
            trend: stl.trend?.[i] || 0,
            seasonal: stl.seasonal?.[i] || 0,
            resid: stl.resid?.[i] || 0,
          })));
        }

        if (forecast?.history_dates && Array.isArray(forecast.history_dates)) {
          const historyData = forecast.history_dates.map((date: string, i: number) => ({
            date,
            value: forecast.history?.[i] || 0,
            type: 'historique',
          }));
          
          const forecastData = (forecast.forecast_dates && Array.isArray(forecast.forecast_dates))
            ? forecast.forecast_dates.map((date: string, i: number) => ({
                date,
                value: forecast.forecast?.[i] || 0,
                type: 'prévision',
              }))
            : [];
          
          setForecastData([...historyData, ...forecastData]);
        }

        if (rfm && Array.isArray(rfm)) {
          setRfmData(rfm.map((row: any) => ({
            client_id: row.client_id,
            recence: row.recence,
            frequence: row.frequence,
            montant: row.montant,
            cluster: row.cluster,
          })));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    };

    fetchData();
  }, []);

  // Define color variants for stat cards
  const statCardColors = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
  ];

  // Format number with thousands separator
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Map of display names for the stats
  const statDisplayNames: Record<string, string> = {
    total_seisms: 'Séismes totaux',
    avg_magnitude: 'Magnitude moyenne',
    max_magnitude: 'Magnitude maximale',
    recent_seisms: 'Séismes récents',
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-400">
          <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Tableau de bord</h1>
          <p className="text-black font-medium mt-1">Vue d'ensemble des données sismiques et analyses prédictives</p>
        </div>

        {/* Stats Grid */}
        {numbers && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {Object.entries(numbers).map(([key, value], index) => (
              <div
                key={key}
                className={`bg-gradient-to-r ${statCardColors[index % statCardColors.length]} rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105`}
              >
                <div className="p-5 text-white">
                  <div className="opacity-80 text-sm font-medium mb-1">
                    {statDisplayNames[key] || key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </div>
                  <div className="text-2xl font-bold">
                    {typeof value === 'number' ? formatNumber(value) : value}
                  </div>
                  <div className="mt-2 flex items-center text-xs opacity-80">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Mise à jour récente
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-400">
          <h2 className="text-lg font-bold text-black mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
              onClick={() => window.location.href = '/civil-security'}
              className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-black">Sécurité Civile</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/seisms_map'}
              className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-black">Carte des séismes</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/stl'}
              className="flex flex-col items-center justify-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-black">Analyse STL</span>
            </button>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-400">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-black">Activité récente</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-bold">Voir tout</button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-black uppercase tracking-tight">Mise à jour des données sismiques</div>
                  <div className="text-xs text-black font-semibold">Il y a {item * 2} heures</div>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Nouveau</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
