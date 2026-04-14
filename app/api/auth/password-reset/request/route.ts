import { NextRequest, NextResponse } from 'next/server';
import { createEmailToken } from '@/lib/emailToken';
import { sendPasswordResetEmail } from '@/lib/email';
import { createRateLimiter, getClientIp } from '@/lib/rateLimit';
import { findAuthUserByEmail } from '@/lib/supabaseAdmin';

const resetRequestLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 8,
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (resetRequestLimiter.isLimited(ip)) {
    return NextResponse.json(
      { error: 'Prea multe cereri de resetare. Incearca din nou mai tarziu.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';

  if (!email) {
    resetRequestLimiter.recordAttempt(ip);
    return NextResponse.json({ error: 'Email invalid.' }, { status: 400 });
  }

  const user = await findAuthUserByEmail(email);
  if (!user) {
    resetRequestLimiter.recordAttempt(ip);
    return NextResponse.json({ ok: true });
  }

  const { token } = await createEmailToken({
    userId: user.id,
    email: user.email ?? email,
    type: 'password_reset',
  });

  await sendPasswordResetEmail({
    to: user.email ?? email,
    token,
  });

  resetRequestLimiter.recordAttempt(ip);
  return NextResponse.json({ ok: true });
}
