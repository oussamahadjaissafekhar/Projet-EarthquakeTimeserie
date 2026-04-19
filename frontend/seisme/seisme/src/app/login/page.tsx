'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@seismo.com');
  const [password, setPassword] = useState('123456789');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Erreur de connexion');
        return;
      }
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err) {
      setError('Erreur réseau ou serveur');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-200 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-center h-16 ">
          <h1 className="text-blue-600 text-2xl font-bold mb-10 flex items-center justify-center gap-2 pt-6 px-5">
            <svg className=" h-14 icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="#51a2ff">
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  fill="#51a2ff"
                  d="M926.784 480H701.312A192.512 192.512 0 00544 322.688V97.216A416.064 416.064 0 01926.784 480zm0 64A416.064 416.064 0 01544 926.784V701.312A192.512 192.512 0 00701.312 544h225.472zM97.28 544h225.472A192.512 192.512 0 00480 701.312v225.472A416.064 416.064 0 0197.216 544zm0-64A416.064 416.064 0 01480 97.216v225.472A192.512 192.512 0 00322.688 480H97.216z"
                ></path>
              </g>
            </svg>
            <span>Seisme Assist</span>
          </h1>
        </div>

        {error && <div className="text-red-500 text-sm font-medium text-center">{error}</div>}

        <div>
          <label className="block text-sm font-bold mb-1 text-black">Identifiant</label>
          <input
            type="text"
            className="w-full border border-gray-400 rounded px-3 py-2 text-black font-medium"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-black">Mot de passe</label>
          <input
            type="password"
            className="w-full border border-gray-400 rounded px-3 py-2 text-black font-medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="text-right">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2 font-medium transition-colors"
          >
            Se connecter
          </button>
        </div>
      </form>
    </div>
  );
}