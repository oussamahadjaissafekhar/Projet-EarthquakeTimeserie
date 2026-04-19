'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        // Déjà connecté → tableau de bord
        router.replace('/dashboard');
      } else {
        // Non connecté → page de login obligatoire
        router.replace('/login');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-200">
      <div className="text-white text-xl animate-pulse">Chargement...</div>
    </div>
  );
}