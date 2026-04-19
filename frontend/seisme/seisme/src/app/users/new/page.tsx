'use client';

import { useState } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';

export default function NewUserPage() {
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    username: '',
    password: '',
  });
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicFile(file);
      
      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });
    if (profilePicFile) {
      formData.append('profile_pic', profilePicFile);
    }

    const res = await fetch('/api/users', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      router.push('/users');
    } else {
      alert('Erreur lors de l’ajout de l’utilisateur');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-xl font-bold mb-4">Ajouter un nouvel utilisateur</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow">
          {/* Email, First name, Last name, Username, Password ... same as before */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2" required />
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium mb-1">Prénom</label>
              <input type="text" name="first_name" value={form.first_name} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium mb-1">Nom</label>
              <input type="text" name="last_name" value={form.last_name} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nom d'utilisateur</label>
            <input type="text" name="username" value={form.username} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2" required />
          </div>

          {/* FILE UPLOAD HERE */}
          <div>
            <label className="block text-sm font-medium mb-1">Photo de profil</label>
            {profilePicPreview && (
              <div className="mb-3">
                <img
                  src={profilePicPreview}
                  alt="Aperçu"
                  className="w-32 h-32 object-cover rounded-full border-2 border-gray-300"
                />
              </div>
            )}
            <input
              type="file"
              name="profile_pic"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Annuler
            </button>
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
