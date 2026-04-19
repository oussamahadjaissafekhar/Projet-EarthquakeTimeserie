import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;

  const [rows] = await db.query(
    'SELECT * FROM client ORDER BY date_inscription DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );

  const [result] = await db.query('SELECT COUNT(*) as total FROM client');
  const total = (result as any)[0].total;

  return NextResponse.json({ data: rows, total });
}