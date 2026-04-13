import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import { createClinicInvite, listClinicTeam } from '@/lib/team';
import { ClinicRole } from '@/lib/types';

function forbiddenResponse() {
  return NextResponse.json(
    { error: 'Doar administratorii clinicii pot gestiona utilizatorii.' },
    { status: 403 }
  );
}

function isValidRole(value: unknown): value is ClinicRole {
  return value === 'clinic_admin' || value === 'vet' || value === 'assistant';
}

function getInviteBaseUrl(req: NextRequest) {
  return process.env.APP_URL?.trim() || new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    return forbiddenResponse();
  }

  const snapshot = await listClinicTeam(context.session.clinicId);
  const apiResponse = NextResponse.json(snapshot);
  applyAuthContextCookies(apiResponse, context);
  return apiResponse;
}

export async function POST(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    return forbiddenResponse();
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const role = body?.role;

  if (!email || !isValidRole(role)) {
    return NextResponse.json(
      { error: 'Emailul și rolul invitației sunt obligatorii.' },
      { status: 400 }
    );
  }

  try {
    const invite = await createClinicInvite({
      clinicId: context.session.clinicId,
      invitedByUserId: context.session.userId,
      inviterName: context.session.fullName ?? context.session.email,
      email,
      role,
      inviteBaseUrl: getInviteBaseUrl(req),
    });

    const snapshot = await listClinicTeam(context.session.clinicId);
    const apiResponse = NextResponse.json({
      ok: true,
      invite,
      snapshot,
    });
    applyAuthContextCookies(apiResponse, context);
    return apiResponse;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nu am putut trimite invitația.',
      },
      { status: 400 }
    );
  }
}
