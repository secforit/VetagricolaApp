import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import speakeasy from 'speakeasy';
import getDb from '@/lib/db';

const TOKEN_COOKIE = 'auth_token';
const PENDING_COOKIE = 'auth_pending';
const TOKEN_MAX_AGE = 60 * 60 * 8; // 8 hours

// Rate limit TOTP attempts: max 5 per IP per 5 minutes
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
  if (!entry || now > entry.resetAt) return false;
  return entry.count >= TOTP_MAX_ATTEMPTS;
}

function recordTotpFailure(ip: string) {
  const now = Date.now();
  const entry = totpAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    totpAttempts.set(ip, { count: 1, resetAt: now + TOTP_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

async function logEvent(ip: string, username: string, event: string, userAgent: string) {
  try {
    await getDb().from('auth_log').insert({ ip, username, event, user_agent: userAgent });
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

  const body = await req.json().catch(() => ({}));
  const { code } = body;

  if (typeof code !== 'string') {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
  }

  // Verify the pending token
  const pendingToken = req.cookies.get(PENDING_COOKIE)?.value;
  if (!pendingToken) {
    return NextResponse.json({ error: 'Sesiune expirată, autentificați-vă din nou' }, { status: 401 });
  }

  const jwtSecret = new TextEncoder().encode(process.env.AUTH_SECRET);
  let username: string;
  let isSetup = false;
  try {
    const { payload } = await jwtVerify(pendingToken, jwtSecret);
    if (typeof payload.username !== 'string') throw new Error('Invalid token');
    if (payload.step === 'totp_setup') {
      isSetup = true;
    } else if (payload.step !== 'totp') {
      throw new Error('Invalid token step');
    }
    username = payload.username;
  } catch {
    return NextResponse.json({ error: 'Sesiune expirată, autentificați-vă din nou' }, { status: 401 });
  }

  // Get TOTP secret from database
  const db = getDb();
  const { data: totpRow } = await db
    .from('totp_secrets')
    .select('secret, verified')
    .eq('username', username)
    .single();

  if (!totpRow) {
    return NextResponse.json({ error: 'TOTP nu este configurat' }, { status: 500 });
  }

  // Verify TOTP code (window=1 accepts ±30s for clock drift)
  const isValid = speakeasy.totp.verify({
    secret: totpRow.secret,
    encoding: 'base32',
    token: code.replace(/\s/g, ''),
    window: 1,
  });

  if (!isValid) {
    recordTotpFailure(ip);
    await logEvent(ip, username, 'totp_failed', userAgent);
    return NextResponse.json({ error: 'Cod invalid' }, { status: 401 });
  }

  // If this is first-time setup, mark as verified
  if (isSetup && !totpRow.verified) {
    await db
      .from('totp_secrets')
      .update({ verified: true })
      .eq('username', username);
  }

  // TOTP OK — issue full session token
  await logEvent(ip, username, 'login_success', userAgent);

  const fullToken = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(jwtSecret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, fullToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  });
  // Clear pending cookie
  res.cookies.set(PENDING_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return res;
}
