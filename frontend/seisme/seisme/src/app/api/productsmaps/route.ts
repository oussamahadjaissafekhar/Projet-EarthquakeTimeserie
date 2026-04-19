// app/api/clients/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {

  try {
    const [rows] = await db.query(`SELECT 
    c.localisation,
    p.produit_id,
    p.nom AS produit_nom,
    p.prix,
    p.image_path,
    COUNT(t.transaction_id) AS ventes
FROM transaction t
JOIN client c ON t.client_id = c.client_id
JOIN produit p ON t.produit_id = p.produit_id
GROUP BY c.localisation, p.produit_id
HAVING ventes = (
    SELECT MAX(sous.ventes)
    FROM (
        SELECT COUNT(t2.transaction_id) AS ventes
        FROM transaction t2
        JOIN client c2 ON t2.client_id = c2.client_id
        WHERE c2.localisation = c.localisation
        GROUP BY t2.produit_id
    ) sous
)
ORDER BY c.localisation, ventes DESC;`);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Database error', details: error }, { status: 500 });
  } 
}
