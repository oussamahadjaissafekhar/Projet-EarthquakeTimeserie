// app/api/clients/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {

  try {
    const [rows] = await db.query('SELECT * FROM produit ORDER BY date_ajout');
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Database error', details: error }, { status: 500 });
  } 
}
