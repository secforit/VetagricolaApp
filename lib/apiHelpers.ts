import { NextRequest, NextResponse } from 'next/server';
import getDb from './db';

const SEARCHABLE_COLUMNS: Record<string, string[]> = {
  clients: ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'obs'],
  pets: ['nickname', 'species', 'breed', 'color', 'chip_number', 'obs'],
  vets: ['first_name', 'last_name', 'email', 'phone', 'license_number'],
  appointments: ['service', 'observations', 'reason', 'user_note'],
  records: ['pet', 'vet', 'service', 'diagnosis', 'comments'],
  prescriptions: ['product_name', 'label', 'recommendations', 'status'],
  reminders: ['protocol_name', 'name'],
  sales: ['invoice_id', 'payment_type', 'status'],
};

const SUPABASE_MAX_ROWS = 1000;

export function listRoute(table: string) {
  return async function GET(req: NextRequest) {
    const supabase = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const page = Math.max(parseInt(searchParams.get('page') ?? '1') || 1, 1);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200') || 200, 500);
    const offset = (page - 1) * limit;

    function buildQuery() {
      let q = supabase.from(table).select('*', { count: 'exact' });
      if (search) {
        const cols = SEARCHABLE_COLUMNS[table] ?? [];
        if (cols.length > 0) {
          q = q.or(cols.map(c => `${c}.ilike.%${search}%`).join(','));
        }
      }
      return q;
    }

    // If requested range fits in one Supabase request, fetch directly
    if (limit <= SUPABASE_MAX_ROWS) {
      const { data, count, error } = await buildQuery().range(offset, offset + limit - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [], total: count ?? 0 });
    }

    // Otherwise batch-fetch in chunks of 1000
    let all: unknown[] = [];
    let total = 0;
    let from = offset;

    while (all.length < limit) {
      const batchSize = Math.min(SUPABASE_MAX_ROWS, limit - all.length);
      const { data, count, error } = await buildQuery().range(from, from + batchSize - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (count !== null) total = count;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      from += data.length;
      if (data.length < batchSize) break;
    }

    return NextResponse.json({ data: all, total });
  };
}

export function createRoute(table: string) {
  return async function POST(req: NextRequest) {
    const supabase = getDb();
    const body = await req.json();
    const { id: _id, ...insertBody } = body;

    const { data, error } = await supabase
      .from(table)
      .insert(insertBody)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  };
}

export function getOneRoute(table: string) {
  return async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = getDb();

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  };
}

export function updateRoute(table: string) {
  return async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = getDb();
    const body = await req.json();
    const { id: _id, ...updateBody } = body;

    const { data, error } = await supabase
      .from(table)
      .update(updateBody)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  };
}

export function deleteRoute(table: string) {
  return async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = getDb();

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  };
}
