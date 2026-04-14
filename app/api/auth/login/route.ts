import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, persistAuthSession, persistPendingSession, persistSupabaseSession } from '@/lib/auth';
import { createUserDbClient } from '@/lib/db';
import prisma from '@/lib/prisma';
import { ensureAdminMfaFactor, getPrimaryClinicContext } from '@/lib/tenant';

// Rate limit login attempts: max 10 per IP per 15 minutes
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    return false;
  }

  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordLoginFailure(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
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

  if (isLoginRateLimited(ip)) {
    await logEvent(ip, '', 'login_rate_limited', userAgent);
    return NextResponse.json(
      { error: 'Prea multe încercări. Încearcă din nou mai târziu.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const email = normalizeEmail(typeof body?.email === 'string' ? body.email : '');
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Emailul și parola sunt obligatorii.' }, { status: 400 });
  }

  const supabase = createUserDbClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    recordLoginFailure(ip);
    await logEvent(ip, email, 'login_failed', userAgent);
    return NextResponse.json({ error: 'Credențiale invalide.' }, { status: 401 });
  }

  const clinicContext = await getPrimaryClinicContext(data.user.id, data.user.email ?? email);
  if (!clinicContext) {
    recordLoginFailure(ip);
    await logEvent(ip, email, 'login_without_membership', userAgent);
    return NextResponse.json(
      { error: 'Contul nu este asociat cu nicio clinică.' },
      { status: 403 }
    );
  }

  if (clinicContext.role === 'clinic_admin') {
    const factor = await ensureAdminMfaFactor(data.user.id, data.user.email ?? email);
    const redirect = factor.verified ? '/login/2fa' : '/login/2fa/setup';
    const response = NextResponse.json({
      ok: true,
      requires2FA: true,
      redirect,
    });
    clearAuthCookies(response);
    persistSupabaseSession(response, data.session);

    await persistPendingSession(response, {
      userId: data.user.id,
      email: data.user.email ?? email,
      clinicId: clinicContext.clinicId,
      step: factor.verified ? 'totp' : 'totp_setup',
    });

    await logEvent(
      ip,
      email,
      factor.verified
        ? clinicContext.clinicAccessible
          ? 'login_pending_2fa'
          : 'login_pending_2fa_inaccessible_clinic'
        : clinicContext.clinicAccessible
          ? 'login_pending_2fa_setup'
          : 'login_pending_2fa_setup_inaccessible_clinic',
      userAgent
    );

    return response;
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  persistSupabaseSession(response, data.session);
  await persistAuthSession(response, {
    userId: data.user.id,
    email: data.user.email ?? email,
    clinicId: clinicContext.clinicId,
  });

  await logEvent(
    ip,
    email,
    clinicContext.clinicAccessible ? 'login_success' : 'login_success_inaccessible_clinic',
    userAgent
  );
  return response;
}
