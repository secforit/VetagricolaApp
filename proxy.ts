import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PREFIXES = [
  '/api/billing/webhook',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-totp',
  '/api/auth/totp-setup',
  '/api/auth/logout',
  '/api/invites/',
  '/api/cron/',
  '/invite/',
  '/legal/',
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secretValue = process.env.AUTH_SECRET;

  if (!secretValue) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Allow Next.js internals and static files
  if (
    PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const secret = new TextEncoder().encode(secretValue);

  const pendingToken = req.cookies.get('auth_pending')?.value;
  if (pendingToken) {
    try {
      const { payload } = await jwtVerify(pendingToken, secret);
      const pendingStep = payload.step === 'totp_setup' ? '/login/2fa/setup' : '/login/2fa';

      if (pathname.startsWith('/login/2fa')) {
        return NextResponse.next();
      }

      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'MFA required' }, { status: 401 });
      }

      const redirectUrl = new URL(pendingStep, req.url);
      redirectUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(redirectUrl);
    } catch {
      // Invalid pending token — fall through to normal auth handling
    }
  }

  if (pathname === '/login' || pathname === '/register') {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.next();
    }

    try {
      await jwtVerify(token, secret);
      return NextResponse.redirect(new URL('/', req.url));
    } catch {
      return NextResponse.next();
    }
  }

  if (pathname.startsWith('/login/2fa')) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check full auth token
  const token = req.cookies.get('auth_token')?.value;
  if (token) {
    try {
      await jwtVerify(token, secret);

      if (pathname === '/login' || pathname === '/register') {
        return NextResponse.redirect(new URL('/', req.url));
      }

      return NextResponse.next();
    } catch {
      // Token invalid or expired
    }
  }

  // API routes return 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // App pages redirect to login
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
