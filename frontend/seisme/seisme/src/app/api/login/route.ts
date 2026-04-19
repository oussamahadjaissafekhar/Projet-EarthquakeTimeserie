// app/api/login/route.ts
import { NextResponse } from 'next/server';
import { LOCAL_USERS } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Recherche dans les utilisateurs locaux
    const match = LOCAL_USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (!match) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Créer l'objet user sans le mot de passe
    const user = {
      id: match.id,
      email: match.email,
      name: match.name,
      role: match.role,
      is_admin: match.is_admin,
    };

    // Générer un pseudo token
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    return NextResponse.json({ token, user }, { status: 200 });
  } catch (err) {
    console.error('Erreur login:', err);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
