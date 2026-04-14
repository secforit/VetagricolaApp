import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/db';
import { consumeEmailToken } from '@/lib/emailToken';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';

  if (!token) {
    return NextResponse.json({ error: 'Token invalid.' }, { status: 400 });
  }

  const record = await consumeEmailToken(token, 'verification');
  if (!record) {
    return NextResponse.json({ error: 'Token invalid sau expirat.' }, { status: 400 });
  }
  if (!record.user_id) {
    return NextResponse.json(
      { error: 'Tokenul nu este asociat cu un utilizator valid.' },
      { status: 400 }
    );
  }

  const admin = getAdminDb();
  await admin.auth.admin.updateUserById(record.user_id, {
    email_confirm: true,
  });

  return NextResponse.json({ ok: true });
}
