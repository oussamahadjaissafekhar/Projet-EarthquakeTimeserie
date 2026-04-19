import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE /api/clients/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const [result]: any = await db.query('DELETE FROM client WHERE client_id = ?', [id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Client supprimé avec succès' });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/clients/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const body = await req.json();
  const { genre, age, localisation, date_inscription, email } = body;

  if (!date_inscription) {
    return NextResponse.json({ error: 'La date d\'inscription est requise' }, { status: 400 });
  }

  try {
    await db.query(
      `UPDATE client 
       SET genre = ?, age = ?, localisation = ?, date_inscription = ?, email = ?
       WHERE client_id = ?`,
      [genre || null, age || null, localisation || null, date_inscription, email || null, id]
    );

    return NextResponse.json({ message: 'Client mis à jour avec succès' });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 });
  }
}
