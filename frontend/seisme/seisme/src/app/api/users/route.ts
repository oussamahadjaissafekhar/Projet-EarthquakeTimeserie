// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // MySQL pool/connection
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// GET: fetch paginated users
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;
    const offset = (page - 1) * limit;

    const [users] = await db.query('SELECT * FROM users LIMIT ? OFFSET ?', [limit, offset]);
    const [result] = await db.query('SELECT COUNT(*) as total FROM users');
    const total = (result as any)[0].total;

    return NextResponse.json({ data: users, total });
  } catch (err: any) {
    console.error('GET /api/users error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Créer un utilisateur
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let email, first_name, last_name, username, password, profilePicPath = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      email = formData.get('email') as string;
      first_name = formData.get('first_name') as string;
      last_name = formData.get('last_name') as string;
      username = formData.get('username') as string;
      password = formData.get('password') as string;
      
      const profilePic = formData.get('profile_pic') as File | null;
      if (profilePic && profilePic.size > 0) {
        const bytes = await profilePic.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Créer le dossier uploads s'il n'existe pas
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        try {
          await mkdir(uploadsDir, { recursive: true });
        } catch (err) {
          // Le dossier existe déjà, on continue
        }
        
        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const filename = `${timestamp}_${profilePic.name}`;
        const filepath = join(uploadsDir, filename);
        
        await writeFile(filepath, buffer);
        profilePicPath = `/uploads/${filename}`;
      }
    } else {
      const body = await req.json();
      email = body.email;
      first_name = body.first_name;
      last_name = body.last_name;
      username = body.username;
      password = body.password;
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    await db.query(
      'INSERT INTO users (email, first_name, last_name, username, password, profile_pic) VALUES (?, ?, ?, ?, ?, ?)',
      [email, first_name, last_name, username, password, profilePicPath]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

