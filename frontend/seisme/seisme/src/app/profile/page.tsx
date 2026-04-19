'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faUser, faIdCard, faCalendar } from '@fortawesome/free-solid-svg-icons';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
      } else {
        router.push('/login');
      }
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">Chargement...</div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Mon Profil</h1>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header avec photo de profil */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                {user.profile_pic ? (
                  <img
                    src={user.profile_pic}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/default-image.png';
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white bg-white flex items-center justify-center shadow-lg">
                    <FontAwesomeIcon icon={faUser} className="w-16 h-16 text-blue-500" />
                  </div>
                )}
              </div>
              <div className="text-white">
                <h2 className="text-3xl font-bold">
                  {user.first_name || ''} {user.last_name || ''}
                </h2>
                <p className="text-blue-100 mt-1">
                  {user.username || 'Aucun nom d\'utilisateur'}
                </p>
              </div>
            </div>
          </div>

          {/* Informations détaillées */}
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Informations personnelles</h3>
            
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faEnvelope} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="text-gray-900 font-medium">{user.email || 'Non renseigné'}</p>
                </div>
              </div>

              {/* Prénom */}
              {user.first_name && (
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faUser} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Prénom</p>
                    <p className="text-gray-900 font-medium">{user.first_name}</p>
                  </div>
                </div>
              )}

              {/* Nom */}
              {user.last_name && (
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faIdCard} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Nom</p>
                    <p className="text-gray-900 font-medium">{user.last_name}</p>
                  </div>
                </div>
              )}

              {/* Nom d'utilisateur */}
              {user.username && (
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faUser} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Nom d'utilisateur</p>
                    <p className="text-gray-900 font-medium">{user.username}</p>
                  </div>
                </div>
              )}

              {/* Date de création */}
              {(user.created_at || user.date_creation || user.date_inscription) && (
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faCalendar} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Date de création</p>
                    <p className="text-gray-900 font-medium">
                      {user.created_at || user.date_creation || user.date_inscription
                        ? new Date(user.created_at || user.date_creation || user.date_inscription).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Non renseigné'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bouton pour modifier le profil */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => router.push(`/users/edit/${user.id}`)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Modifier mon profil
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

