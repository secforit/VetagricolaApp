import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { clearAuthCookies, persistAuthSession, readPendingToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

const TOTP_WINDOW_MS = 5 * 60 * 1000;
const TOTP_MAX_ATTEMPTS = 5;
const totpAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isTotpRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = totpAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    return false;
  }

  return entry.count >= TOTP_MAX_ATTEMPTS;
}

function recordTotpFailure(ip: string) {
  const now = Date.now();
  const entry = totpAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    totpAttempts.set(ip, { count: 1, resetAt: now + TOTP_WINDOW_MS });
    return;
  }

  entry.count += 1;
}

async function logEvent(ip: string, email: string, event: string, userAgent: string) {
  try {
    await prisma.authLog.create({
      data: {
        ip,
        username: email,
        event,
        user_agent: userAgent,
      },
    });
  } catch {
    console.warn('[auth] audit log write failed');
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') ?? '';

  if (isTotpRateLimited(ip)) {
    await logEvent(ip, '', 'totp_rate_limited', userAgent);
    return NextResponse.json(
      { error: 'Prea multe încercări. Încearcă din nou peste 5 minute.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code.replace(/\s/g, '') : '';

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Cod invalid.' }, { status: 400 });
  }

  const pending = await readPendingToken(req.cookies);
  if (
    !pending?.sub ||
    typeof pending.email !== 'string' ||
    typeof pending.clinicId !== 'string' ||
    (pending.step !== 'totp' && pending.step !== 'totp_setup')
  ) {
    const response = NextResponse.json(
      { error: 'Sesiunea MFA a expirat. Autentifică-te din nou.' },
      { status: 401 }
    );
    clearAuthCookies(response);
    return response;
  }

  const factor = await prisma.authMfaFactor.findUnique({
    where: { user_id: pending.sub },
    select: {
      secret: true,
      verified: true,
    },
  });

  if (!factor) {
    return NextResponse.json({ error: 'MFA nu este configurat.' }, { status: 500 });
  }

  const isValid = speakeasy.totp.verify({
    secret: factor.secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!isValid) {
    recordTotpFailure(ip);
    await logEvent(ip, pending.email, 'totp_failed', userAgent);
    return NextResponse.json({ error: 'Cod invalid.' }, { status: 401 });
  }

  if (pending.step === 'totp_setup' && !factor.verified) {
    await prisma.authMfaFactor.update({
      where: { user_id: pending.sub },
      data: { verified: true },
    });
  }

  const response = NextResponse.json({ ok: true });
  await persistAuthSession(response, {
    userId: pending.sub,
    email: pending.email,
    clinicId: pending.clinicId,
  });

  await logEvent(ip, pending.email, 'login_success', userAgent);
  return response;
}
