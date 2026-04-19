// app/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  profile_pic?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    // Vérifier l'admin côté client
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!userStr) {
      window.location.href = '/';
      return;
    }
    try {
      const u = JSON.parse(userStr);
      if (!u?.is_admin) {
        window.location.href = '/';
        return;
      }
    } catch {
      window.location.href = '/';
      return;
    }

    fetch(`/api/users?page=${page}`)
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => {
        setUsers(data.data);
        setTotal(data.total);
      })
      .catch(() => {
        window.location.href = '/';
      });
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  const handleDelete = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      fetch(`/api/users/${id}`, { method: 'DELETE' }).then(() => {
        setUsers(users.filter(u => u.id !== id));
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Utilisateurs</h1>
          <a
            href="/users/new"
            className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1 rounded-lg shadow"
          >
            + Nouvel Utilisateur
          </a>
        </div>

        <div className="overflow-x-auto rounded-xl shadow-md bg-white">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Nom d'utilisateur</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} className={`hover:bg-gray-50 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="px-4 py-2">{u.id}</td>
                  <td className="px-4 py-2">{u.first_name} {u.last_name}</td>
                  <td className="px-4 py-2">{u.username}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                  <img
                      src={u.profile_pic || '/default-image.png'}
                      alt={u.first_name}
                      className="w-10 h-10 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-image.png';
                      }}
                    />
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    <a
                      href={`/users/edit/${u.id}`}
                      className="text-white text-xs bg-blue-500 px-2 py-1 rounded"
                    >
                      Modifier <FontAwesomeIcon icon={faEdit} />
                    </a>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-white text-xs bg-blue-500 px-2 py-1 rounded"
                    >
                      Supprimer <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
