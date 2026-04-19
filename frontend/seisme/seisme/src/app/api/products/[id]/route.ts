import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';


export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const [result]: any = await db.query('DELETE FROM produit WHERE produit_id = ?', [id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const body = await req.json();
  const { categorie_id, prix, stock, date_ajout, nom, image_path, description } = body;

  try {
    await db.query(
      `UPDATE produit 
       SET categorie_id = ?, prix = ?, stock = ?, date_ajout = ?, nom = ?, image_path = ?, description = ?
       WHERE produit_id = ?`,
      [categorie_id || null, prix, stock, date_ajout, nom, image_path || '', description || '', id]
    );

    return NextResponse.json({ message: 'Produit mis à jour avec succès' });
  } catch {
    return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 });
  }
}