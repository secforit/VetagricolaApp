import { NextRequest, NextResponse } from 'next/server';
import { createEmailToken } from '@/lib/emailToken';
import { sendVerificationEmail } from '@/lib/email';
import { createRateLimiter, getClientIp } from '@/lib/rateLimit';
import { findAuthUserByEmail } from '@/lib/supabaseAdmin';

const resendLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 6,
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (resendLimiter.isLimited(ip)) {
    return NextResponse.json(
      { error: 'Prea multe cereri. Incearca din nou mai tarziu.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';

  if (!email) {
    resendLimiter.recordAttempt(ip);
    return NextResponse.json({ error: 'Email invalid.' }, { status: 400 });
  }

  const user = await findAuthUserByEmail(email);
  if (!user) {
    resendLimiter.recordAttempt(ip);
    return NextResponse.json({ error: 'Emailul nu este înregistrat.' }, { status: 404 });
  }

  if (user.email_confirmed_at) {
    return NextResponse.json({ ok: true });
  }

  const { token } = await createEmailToken({
    userId: user.id,
    email: user.email ?? email,
    type: 'verification',
  });

  await sendVerificationEmail({
    to: user.email ?? email,
    token,
    firstName: user.user_metadata?.first_name ?? null,
  });

  resendLimiter.recordAttempt(ip);
  return NextResponse.json({ ok: true });
}
