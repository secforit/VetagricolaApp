import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Paths that skip auth entirely
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/verify-totp',
  '/api/auth/totp-setup',
  '/api/auth/logout',
];
const ALWAYS_PUBLIC = ['/_next', '/favicon.ico', '/logo.png', '/Logo-SECFORIT.png'];

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow static assets
  if (ALWAYS_PUBLIC.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // IP allowlisting — if ALLOWED_IPS is set, block everyone else
  const allowedIpsEnv = process.env.ALLOWED_IPS;
  if (allowedIpsEnv) {
    const ip = getClientIp(req);
    const allowed = allowedIpsEnv.split(',').map(s => s.trim()).filter(Boolean);
    if (ip !== 'unknown' && !allowed.includes(ip)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return new NextResponse('403 Access Denied', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  // Public paths skip JWT check
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Validate AUTH_SECRET
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    console.error('[auth] AUTH_SECRET is missing or too short — blocking all requests');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Verify JWT session cookie
  const token = req.cookies.get('auth_token')?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      return NextResponse.next();
    } catch {
      // Token invalid or expired — fall through to deny
    }
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|logo\\.png).*)'],
};

