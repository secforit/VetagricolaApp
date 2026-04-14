import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import getDb from '@/lib/db';

const TOKEN_COOKIE = 'auth_token';
const PENDING_COOKIE = 'auth_pending';
const TOKEN_MAX_AGE = 60 * 60 * 8;   // 8 hours
const PENDING_MAX_AGE = 60 * 5;      // 5 minutes (TOTP window)

// In-memory rate limiter: max 5 failed attempts per IP per 15 minutes
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) return false;
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(ip: string) {
  attempts.delete(ip);
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

  if (isRateLimited(ip)) {
    await logEvent(ip, '', 'rate_limited', userAgent);
    return NextResponse.json(
      { error: 'Prea multe încercări. Încearcă din nou peste 15 minute.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { username, password } = body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
  }

  // Look up user in Supabase
  const db = getDb();
  const { data: userRow } = await db
    .from('users')
    .select('password_hash')
    .eq('username', username)
    .single();

  if (!userRow || !(await bcrypt.compare(password, userRow.password_hash))) {
    recordFailure(ip);
    await logEvent(ip, username, 'login_failed', userAgent);
    return NextResponse.json({ error: 'Credențiale invalide' }, { status: 401 });
  }

  clearAttempts(ip);

  const jwtSecret = new TextEncoder().encode(process.env.AUTH_SECRET);

  // Check TOTP status in database
  const { data: totpRow } = await db
    .from('totp_secrets')
    .select('secret, verified')
    .eq('username', username)
    .single();

  if (totpRow && totpRow.verified) {
    // TOTP is set up and verified — require 2FA code
    const pendingToken = await new SignJWT({ username, step: 'totp' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${PENDING_MAX_AGE}s`)
      .sign(jwtSecret);

    const res = NextResponse.json({ totp: true });
    res.cookies.set(PENDING_COOKIE, pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: PENDING_MAX_AGE,
      path: '/',
    });
    return res;
  }

  // TOTP not set up yet — generate secret and redirect to setup
  let secret: string;
  if (totpRow && !totpRow.verified) {
    // Reuse existing unverified secret
    secret = totpRow.secret;
  } else {
    // Generate new secret
    const generated = speakeasy.generateSecret({
      name: `CanisVet:${username}`,
      length: 20,
    });
    secret = generated.base32;
    await db.from('totp_secrets').upsert({ username, secret, verified: false });
  }

  const pendingToken = await new SignJWT({ username, step: 'totp_setup' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_MAX_AGE}s`)
    .sign(jwtSecret);

  const res = NextResponse.json({ totp_setup: true });
  res.cookies.set(PENDING_COOKIE, pendingToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: PENDING_MAX_AGE,
    path: '/',
  });
  return res;
}
