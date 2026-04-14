import { NextRequest, NextResponse } from 'next/server';
import { reconcileBillingStates } from '@/lib/billing';

const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || CRON_SECRET.length < 16) {
    return NextResponse.json(
      { error: 'CRON_SECRET lipseste sau este invalid.' },
      { status: 500 }
    );
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await reconcileBillingStates();
  return NextResponse.json({
    ok: true,
    ...result,
  });
}
