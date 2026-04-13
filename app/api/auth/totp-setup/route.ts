import { NextRequest, NextResponse } from 'next/server';
import { readPendingToken } from '@/lib/auth';
import { ensureAdminMfaFactor } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  const pending = await readPendingToken(req.cookies);

  if (!pending?.sub || pending.step !== 'totp_setup' || typeof pending.email !== 'string') {
    return NextResponse.json({ error: 'Sesiune expirată' }, { status: 401 });
  }

  const factor = await ensureAdminMfaFactor(pending.sub, pending.email);
  if (factor.verified) {
    return NextResponse.json({ error: 'MFA este deja configurat' }, { status: 400 });
  }

  return NextResponse.json({
    secret: factor.secret,
    otpauth_url: factor.otpauthUrl,
  });
}
