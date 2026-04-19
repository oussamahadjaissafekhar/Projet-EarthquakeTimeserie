import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;

  const [rows] = await db.query('SELECT * FROM produit ORDER BY date_ajout DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [result] = await db.query('SELECT COUNT(*) as total FROM produit');
  const total = (result as any)[0].total;

  return NextResponse.json({ data: rows, total });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { categorie_id, prix, stock, date_ajout, nom, image_path, description } = body;
  
    if (!prix || !stock || !date_ajout || !nom) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
  
    try {
      const [result] = await db.query(
        `INSERT INTO produit (categorie_id, prix, stock, date_ajout, nom, image_path, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [categorie_id || null, prix, stock, date_ajout, nom, image_path || '', description || '']
      );
  
      return NextResponse.json({ message: 'Produit créé', id: (result as any).insertId });
    } catch (error) {
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
    }
  }
  
