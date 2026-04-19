'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import Layout from '../components/Layout';
import { useSearchParams } from 'next/navigation';

interface Forecast {
  date: string;
  ventes_prevues: number;
  ic_inferieur: number | null;
  ic_superieur: number | null;
}

interface ClientOption {
  client_id: number;
  name: string;
  nom_complet: string;
}

interface ProductOption {
  produit_id: number;
  nom: string;
}

export default function LSTMForecastPage() {
  const [data, setData] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<number>(0);
  const [clientReady, setClientReady] = useState(false);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);

  const searchParams = useSearchParams();

  useEffect(() => {
    const clientFromURL = Number(searchParams.get('client_id'));
    if (!isNaN(clientFromURL) && clientFromURL > 0) {
      setSelectedClient(clientFromURL);
    }
    setClientReady(true);
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/maps')
      .then(res => res.json())
      .then((clientList: ClientOption[]) => {
        setClients([{ client_id: 0, nom_complet: 'Toutes', name: 'Toutes' }, ...clientList]);
      });
  }, []);

  useEffect(() => {
    fetch('/api/field_product')
      .then(res => res.json())
      .then((productList: ProductOption[]) => {
        setProducts(productList);
      });
  }, []);

  useEffect(() => {
    if (clientReady) {
      setLoading(true);
      fetch(`http://localhost:8000/lstm?client=${selectedClient}&produit_id=${selectedProduct}`)
        .then(res => res.json())
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [selectedClient, selectedProduct, clientReady]);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Prévision des ventes (LSTM - 30 jours)</h1>

        <div className="flex gap-4 mb-4">


          <div>
            <label htmlFor="productSelect" className="block text-sm font-medium mb-1">Produit</label>
            <select
              id="productSelect"
              className="border border-gray-300 rounded px-2 py-1"
              value={selectedProduct ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedProduct(value ? Number(value) : 0);
              }}
            >
              <option value="">Tous</option>
              {products.map((product) => (
                <option key={product.produit_id} value={product.produit_id}>
                  {product.nom}
                </option>
              ))}
            </select>
          </div>

          <div  className="">
            <label htmlFor="clientSelect" className="block text-sm font-medium mb-1">Période</label>
            <select
              id="clientSelect"
              className="border border-gray-300 rounded px-2 py-1"
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(Number(e.target.value));
                setSelectedProduct(0);
              }}
            >
              {clients.map((client) => (
                <option key={client.client_id} value={client.client_id}>
                  {client.nom_complet}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <Area
                type="monotone"
                dataKey="ventes_prevues"
                stroke="#FFA500"
                fill="#FFA500"
                name="Ventes"
              />
              <Area
                type="monotone"
                dataKey="ic_inferieur"
                stroke="#82ca9d"
                fillOpacity={0}
                name="Intervalle inf."
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="ic_superieur"
                stroke="#82ca9d"
                fillOpacity={0}
                name="Intervalle sup."
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Layout>
  );
}
