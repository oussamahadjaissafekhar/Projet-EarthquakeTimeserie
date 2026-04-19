'use client';

import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

// Define type for a seism (earthquake) event
interface Seism {
  time: string;
  latitude: number;
  longitude: number;
  depth: number;
  mag: number;
  place: string;
  id: string;
  // Add more fields as needed from the CSV
}

export default function SeismsPage() {
  const [seisms, setSeisms] = useState<Seism[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // États pour les filtres
  const [minMagnitude, setMinMagnitude] = useState<number | ''>('');
  const [maxMagnitude, setMaxMagnitude] = useState<number | ''>('');
  const [minDepth, setMinDepth] = useState<number | ''>('');
  const [maxDepth, setMaxDepth] = useState<number | ''>('');
  const [minLatitude, setMinLatitude] = useState<number | ''>('');
  const [maxLatitude, setMaxLatitude] = useState<number | ''>('');
  const [minLongitude, setMinLongitude] = useState<number | ''>('');
  const [maxLongitude, setMaxLongitude] = useState<number | ''>('');

  const [appliedFilters, setAppliedFilters] = useState({
    minMag: null as number | null,
    maxMag: null as number | null,
    minDepth: null as number | null,
    maxDepth: null as number | null,
    minLat: null as number | null,
    maxLat: null as number | null,
    minLon: null as number | null,
    maxLon: null as number | null
  });
  const limit = 10;

  useEffect(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(appliedFilters.minMag !== null && { min_mag: appliedFilters.minMag.toString() }),
      ...(appliedFilters.maxMag !== null && { max_mag: appliedFilters.maxMag.toString() }),
      ...(appliedFilters.minDepth !== null && { min_depth: appliedFilters.minDepth.toString() }),
      ...(appliedFilters.maxDepth !== null && { max_depth: appliedFilters.maxDepth.toString() }),
      ...(appliedFilters.minLat !== null && { min_lat: appliedFilters.minLat.toString() }),
      ...(appliedFilters.maxLat !== null && { max_lat: appliedFilters.maxLat.toString() }),
      ...(appliedFilters.minLon !== null && { min_lon: appliedFilters.minLon.toString() }),
      ...(appliedFilters.maxLon !== null && { max_lon: appliedFilters.maxLon.toString() })
    });

    fetch(`http://${window.location.hostname}:8000/seisms?${params}`)
      .then(res => res.json())
      .then(data => {
        setSeisms(data.data || []);
        setTotal(data.total || 0);
      })
      .catch(err => console.error("Failed to fetch seisms:", err));
  }, [page, appliedFilters]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters({
      minMag: minMagnitude === '' ? null : Number(minMagnitude),
      maxMag: maxMagnitude === '' ? null : Number(maxMagnitude),
      minDepth: minDepth === '' ? null : Number(minDepth),
      maxDepth: maxDepth === '' ? null : Number(maxDepth),
      minLat: minLatitude === '' ? null : Number(minLatitude),
      maxLat: maxLatitude === '' ? null : Number(maxLatitude),
      minLon: minLongitude === '' ? null : Number(minLongitude),
      maxLon: maxLongitude === '' ? null : Number(maxLongitude)
    });
    setPage(1); // Reset to first page when applying new filters
  };

  const resetFilters = () => {
    setMinMagnitude('');
    setMaxMagnitude('');
    setMinDepth('');
    setMaxDepth('');
    setMinLatitude('');
    setMaxLatitude('');
    setMinLongitude('');
    setMaxLongitude('');
    setAppliedFilters({ 
      minMag: null, 
      maxMag: null, 
      minDepth: null, 
      maxDepth: null,
      minLat: null,
      maxLat: null,
      minLon: null,
      maxLon: null
    });
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-3">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-4 text-black uppercase tracking-tight">Liste des Séismes</h1>

          <div className="border border-gray-400 rounded-lg p-4 shadow-sm bg-white">
            <form onSubmit={handleFilter} className="space-y-4">
              <div className="flex flex-wrap gap-6">
                {/* Filtre Magnitude */}
                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-sm font-bold text-black mb-3 uppercase">Magnitude</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="minMagnitude" className="block text-xs font-bold text-black mb-1">Min</label>
                      <input
                        type="number"
                        id="minMagnitude"
                        step="0.1"
                        min="0"
                        max={maxMagnitude || ''}
                        value={minMagnitude}
                        onChange={(e) => setMinMagnitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:ring-2 focus:ring-blue-500 text-black font-medium"
                        placeholder="0.0"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="maxMagnitude" className="block text-xs font-bold text-black mb-1">Max</label>
                      <input
                        type="number"
                        id="maxMagnitude"
                        step="0.1"
                        min={minMagnitude || '0'}
                        value={maxMagnitude}
                        onChange={(e) => setMaxMagnitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:ring-2 focus:ring-blue-500 text-black font-medium"
                        placeholder="10.0"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtre Profondeur */}
                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-md font-medium text-gray-700 mb-3">Profondeur (km)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="minDepth" className="block text-xs font-medium text-gray-600 mb-1">Min</label>
                      <input
                        type="number"
                        id="minDepth"
                        step="1"
                        min="0"
                        max={maxDepth || ''}
                        value={minDepth}
                        onChange={(e) => setMinDepth(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="maxDepth" className="block text-xs font-medium text-gray-600 mb-1">Max</label>
                      <input
                        type="number"
                        id="maxDepth"
                        step="1"
                        min={minDepth || '0'}
                        value={maxDepth}
                        onChange={(e) => setMaxDepth(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1000"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtre Position */}
                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-sm font-bold text-black mb-3 uppercase">Position</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-black mb-1">Latitude</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="number"
                            step="0.001"
                            min="-90"
                            max="90"
                            value={minLatitude}
                            onChange={(e) => setMinLatitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:ring-2 focus:ring-blue-500 text-black font-medium"
                            placeholder="Min (16.0)"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.001"
                            min={minLatitude !== '' ? minLatitude : '-90'}
                            max="90"
                            value={maxLatitude}
                            onChange={(e) => setMaxLatitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:ring-2 focus:ring-blue-500 text-black font-medium"
                            placeholder="Max (30.0)"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 mb-1">Longitude</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="number"
                            step="0.001"
                            min="-180"
                            max="180"
                            value={minLongitude}
                            onChange={(e) => setMinLongitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Min (-180)"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.001"
                            min={minLongitude !== '' ? minLongitude : '-180'}
                            max="180"
                            value={maxLongitude}
                            onChange={(e) => setMaxLongitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Max (180)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Réinitialiser
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Appliquer
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl shadow-md bg-white border border-gray-400">
          <table className="w-full text-sm text-left text-black">
            <thead className="bg-gray-100 sticky top-0 text-black font-bold uppercase text-xs border-b border-gray-400">
              <tr>
                <th className="px-4 py-3">Date & Heure</th>
                <th className="px-4 py-3">Lieu</th>
                <th className="px-4 py-3">Magnitude</th>
                <th className="px-4 py-3">Profondeur (km)</th>
                <th className="px-4 py-3">Latitude</th>
                <th className="px-4 py-3">Longitude</th>
                <th className="px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {seisms.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`hover:bg-gray-50 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <td className="px-4 py-2">
                    {new Date(s.time).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-2">{s.place}</td>
                  <td className="px-4 py-2">
                    <span className="font-bold text-red-600">{s.mag}</span>
                  </td>
                  <td className="px-4 py-2">{s.depth}</td>
                  <td className="px-4 py-2">{s.latitude.toFixed(3)}</td>
                  <td className="px-4 py-2">{s.longitude.toFixed(3)}</td>
                  <td className="px-4 py-2 text-xs font-mono">{s.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination (reuse your existing logic) */}
        <div className="flex justify-center items-center gap-1 mt-6 text-sm">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="w-8 h-8 border border-gray-300 rounded disabled:opacity-40"
          >
            «
          </button>

          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="w-8 h-8 border border-gray-300 rounded disabled:opacity-40"
          >
            ‹
          </button>

          {page > 2 && <span className="w-8 text-center">…</span>}

          {page > 1 && (
            <button
              onClick={() => setPage(page - 1)}
              className="w-8 h-8 border border-gray-300 rounded"
            >
              {page - 1}
            </button>
          )}

          <span className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded border border-gray-300">
            {page}
          </span>

          {page < totalPages && (
            <button
              onClick={() => setPage(page + 1)}
              className="w-8 h-8 border border-gray-300 rounded"
            >
              {page + 1}
            </button>
          )}

          {page < totalPages - 1 && <span className="w-8 text-center">…</span>}

          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="w-8 h-8 border border-gray-300 rounded disabled:opacity-40"
          >
            ›
          </button>

          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="w-8 h-8 border border-gray-300 rounded disabled:opacity-40"
          >
            »
          </button>
        </div>
      </div>
    </Layout>
  );
}