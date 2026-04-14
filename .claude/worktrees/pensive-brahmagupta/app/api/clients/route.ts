import { NextRequest, NextResponse } from 'next/server';
import { createRoute } from '@/lib/apiHelpers';
import getDb from '@/lib/db';

export const POST = createRoute('clients');

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '200');
  const offset = (page - 1) * limit;

  let query = db.from('clients').select('*', { count: 'exact' });

  if (search) {
    const cols = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'obs'];
    query = query.or(cols.map(c => `${c}.ilike.%${search}%`).join(','));
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count pets per client
  const { data: petRows } = await db.from('pets').select('client_id');
  const petCounts: Record<number, number> = {};
  for (const row of petRows ?? []) {
    petCounts[row.client_id] = (petCounts[row.client_id] ?? 0) + 1;
  }

  const enriched = (data ?? []).map(client => ({
    ...client,
    pet_count: petCounts[client.id] ?? 0,
  }));

  return NextResponse.json({ data: enriched, total: count ?? 0 });
}
