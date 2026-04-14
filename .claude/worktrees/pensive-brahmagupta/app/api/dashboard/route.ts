import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  const supabase = getDb();
  const tables = ['clients', 'pets', 'vets', 'appointments', 'records', 'prescriptions', 'reminders', 'sales'];
  const counts: Record<string, number> = {};

  await Promise.all(
    tables.map(async (t) => {
      const { count } = await supabase
        .from(t)
        .select('*', { count: 'exact', head: true });
      counts[t] = count ?? 0;
    })
  );

  return NextResponse.json(counts);
}
