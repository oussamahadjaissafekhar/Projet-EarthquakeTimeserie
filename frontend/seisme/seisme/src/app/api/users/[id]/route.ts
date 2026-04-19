import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Récupérer un utilisateur par id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    const user = (rows as any[])[0];
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('GET /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Mettre à jour un utilisateur
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

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
      const data = await req.json();
      email = data.email;
      first_name = data.first_name;
      last_name = data.last_name;
      username = data.username;
      password = data.password;
    }

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Si un nouveau mot de passe n'est pas fourni, ne pas le mettre à jour
    const updateFields = ['email', 'first_name', 'last_name', 'username'];
    const updateValues: any[] = [email, first_name || null, last_name || null, username || null];
    
    if (password) {
      updateFields.push('password');
      updateValues.push(password);
    }
    
    if (profilePicPath) {
      updateFields.push('profile_pic');
      updateValues.push(profilePicPath);
    }
    
    updateValues.push(id);
    
    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    await db.query(
      `UPDATE users SET ${setClause} WHERE id = ?`,
      updateValues
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Supprimer un utilisateur
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  try {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


