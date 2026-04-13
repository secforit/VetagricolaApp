import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import getDb from '@/lib/db';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') ?? '';

  // Try to read username from token for the audit log
  let username = 'unknown';
  const token = req.cookies.get('auth_token')?.value;
  if (token && process.env.AUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.AUTH_SECRET)
      );
      if (typeof payload.username === 'string') username = payload.username;
    } catch { /* token may be expired — that's fine */ }
  }

  try {
    await getDb().from('auth_log').insert({ ip, username, event: 'logout', user_agent: userAgent });
  } catch {
    console.warn('[auth] audit log write failed');
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return res;
}
