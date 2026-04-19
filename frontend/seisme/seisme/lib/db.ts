/**
 * Module de base de données — Authentification locale
 * Pas de dépendance MySQL requise.
 */

// Utilisateurs locaux pour l'authentification
export const LOCAL_USERS = [
  {
    id: 1,
    email: 'admin@seismo.com',
    password: '123456789',
    name: 'Administrateur',
    role: 'admin',
    is_admin: true,
  },
  {
    id: 2,
    email: 'sismologue@seismo.com',
    password: '123456789',
    name: 'Sismologue',
    role: 'sismologue',
    is_admin: false,
  },
  {
    id: 3,
    email: 'civil@seismo.com',
    password: '123456789',
    name: 'Agent Sécurité Civile',
    role: 'securite_civile',
    is_admin: false,
  },
];

// Placeholder db export (compatibilité avec les autres imports existants)
export const db = null;