import { NextRequest, NextResponse } from 'next/server';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { JWTPayload, SignJWT, jwtVerify } from 'jose';
import { createUserDbClient } from './db';
import { getClinicContextForUser } from './tenant';
import { AppSession } from './types';

export const AUTH_COOKIE = 'auth_token';
export const PENDING_COOKIE = 'auth_pending';
export const SUPABASE_ACCESS_COOKIE = 'sb_access_token';
export const SUPABASE_REFRESH_COOKIE = 'sb_refresh_token';

const AUTH_MAX_AGE = 60 * 60 * 8;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;
const PENDING_MAX_AGE = 60 * 10;

type TotpStep = 'totp' | 'totp_setup';

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

interface AuthTokenPayload extends JWTPayload {
  email: string;
  clinicId: string;
}

interface PendingTokenPayload extends JWTPayload {
  email: string;
  clinicId: string;
  step: TotpStep;
}

interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  changed: boolean;
}

export interface RequestAuthContext {
  session: AppSession;
  supabase: SupabaseClient;
  tokenState: TokenState;
}

interface AuthContextOptions {
  allowInaccessibleClinic?: boolean;
}

function getJwtSecret() {
  const value = process.env.AUTH_SECRET;

  if (!value) {
    throw new Error('AUTH_SECRET is missing');
  }

  return new TextEncoder().encode(value);
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge,
    path: '/',
  };
}

function clearCookieOptions() {
  return cookieOptions(0);
}

async function signToken(
  payload: Record<string, string | boolean>,
  subject: string,
  expiresInSeconds: number
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(getJwtSecret());
}

async function verifyToken<T extends JWTPayload>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as T;
  } catch {
    return null;
  }
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function inaccessibleClinicResponse(session: AppSession) {
  return NextResponse.json(
    {
      error: 'Clinica este suspendată sau perioada de grație a expirat.',
      clinicStatus: session.clinicStatus,
      trialEnd: session.trialEnd,
      graceEnd: session.graceEnd,
    },
    { status: 402 }
  );
}

function unauthorizedAndClearCookies() {
  const response = unauthorizedResponse();
  clearAuthCookies(response);
  return response;
}

export async function createAuthToken(args: {
  userId: string;
  email: string;
  clinicId: string;
}) {
  return signToken(
    {
      email: args.email,
      clinicId: args.clinicId,
    },
    args.userId,
    AUTH_MAX_AGE
  );
}

export async function createPendingToken(args: {
  userId: string;
  email: string;
  clinicId: string;
  step: TotpStep;
}) {
  return signToken(
    {
      email: args.email,
      clinicId: args.clinicId,
      step: args.step,
    },
    args.userId,
    PENDING_MAX_AGE
  );
}

export async function readAuthToken(cookies: CookieReader): Promise<AuthTokenPayload | null> {
  const token = cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return verifyToken<AuthTokenPayload>(token);
}

export async function readPendingToken(cookies: CookieReader): Promise<PendingTokenPayload | null> {
  const token = cookies.get(PENDING_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return verifyToken<PendingTokenPayload>(token);
}

export function persistSupabaseSession(response: NextResponse, session: Session) {
  const now = Math.floor(Date.now() / 1000);
  const accessMaxAge = session.expires_at ? Math.max(60, session.expires_at - now) : AUTH_MAX_AGE;

  response.cookies.set(SUPABASE_ACCESS_COOKIE, session.access_token, cookieOptions(accessMaxAge));
  response.cookies.set(SUPABASE_REFRESH_COOKIE, session.refresh_token, cookieOptions(REFRESH_MAX_AGE));
}

export async function persistAuthSession(
  response: NextResponse,
  session: { userId: string; email: string; clinicId: string }
) {
  response.cookies.set(AUTH_COOKIE, await createAuthToken(session), cookieOptions(AUTH_MAX_AGE));
  response.cookies.set(PENDING_COOKIE, '', clearCookieOptions());
}

export async function persistPendingSession(
  response: NextResponse,
  session: { userId: string; email: string; clinicId: string; step: TotpStep }
) {
  response.cookies.set(PENDING_COOKIE, await createPendingToken(session), cookieOptions(PENDING_MAX_AGE));
  response.cookies.set(AUTH_COOKIE, '', clearCookieOptions());
}

export function applyAuthContextCookies(response: NextResponse, context: RequestAuthContext) {
  if (!context.tokenState.changed) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const accessMaxAge = context.tokenState.expiresAt
    ? Math.max(60, context.tokenState.expiresAt - now)
    : AUTH_MAX_AGE;

  response.cookies.set(
    SUPABASE_ACCESS_COOKIE,
    context.tokenState.accessToken,
    cookieOptions(accessMaxAge)
  );
  response.cookies.set(
    SUPABASE_REFRESH_COOKIE,
    context.tokenState.refreshToken,
    cookieOptions(REFRESH_MAX_AGE)
  );
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE, '', clearCookieOptions());
  response.cookies.set(PENDING_COOKIE, '', clearCookieOptions());
  response.cookies.set(SUPABASE_ACCESS_COOKIE, '', clearCookieOptions());
  response.cookies.set(SUPABASE_REFRESH_COOKIE, '', clearCookieOptions());
}

export async function getSessionFromCookieStore(cookies: CookieReader): Promise<AppSession | null> {
  const payload = await readAuthToken(cookies);
  if (!payload?.sub || typeof payload.email !== 'string' || typeof payload.clinicId !== 'string') {
    return null;
  }

  return getClinicContextForUser(payload.sub, payload.clinicId, payload.email);
}

export async function getRequestAuthContext(
  req: NextRequest,
  options: AuthContextOptions = {}
): Promise<{ context: RequestAuthContext | null; response: NextResponse | null }> {
  const payload = await readAuthToken(req.cookies);
  if (!payload?.sub || typeof payload.email !== 'string' || typeof payload.clinicId !== 'string') {
    return { context: null, response: unauthorizedResponse() };
  }

  const accessToken = req.cookies.get(SUPABASE_ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(SUPABASE_REFRESH_COOKIE)?.value;

  if (!accessToken || !refreshToken) {
    return { context: null, response: unauthorizedAndClearCookies() };
  }

  const supabase = createUserDbClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return { context: null, response: unauthorizedAndClearCookies() };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user || userData.user.id !== payload.sub) {
    return { context: null, response: unauthorizedAndClearCookies() };
  }

  const session = await getClinicContextForUser(
    userData.user.id,
    payload.clinicId,
    userData.user.email ?? payload.email
  );

  if (!session) {
    return { context: null, response: unauthorizedAndClearCookies() };
  }

  if (!options.allowInaccessibleClinic && !session.clinicAccessible) {
    return { context: null, response: inaccessibleClinicResponse(session) };
  }

  return {
    context: {
      session,
      supabase,
      tokenState: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? null,
        changed:
          data.session.access_token !== accessToken || data.session.refresh_token !== refreshToken,
      },
    },
    response: null,
  };
}

export async function requireAuth(
  req: NextRequest,
  options: AuthContextOptions = {}
): Promise<NextResponse | null> {
  const { response } = await getRequestAuthContext(req, options);
  return response;
}
