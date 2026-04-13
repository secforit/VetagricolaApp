import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/db';
import { consumeEmailToken, markPasswordResetUsed } from '@/lib/emailToken';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!token || password.length < 10) {
    return NextResponse.json({ error: 'Token invalid sau parola prea scurtă.' }, { status: 400 });
  }

  const record = await consumeEmailToken(token, 'password_reset');
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
    password,
  });

  await markPasswordResetUsed(record.user_id);

  return NextResponse.json({ ok: true });
}
