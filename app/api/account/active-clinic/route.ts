import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext, persistAuthSession } from '@/lib/auth';
import { activateClinicForUser } from '@/lib/tenant';

export async function POST(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req, {
    allowInaccessibleClinic: true,
  });
  if (!context) {
    return response!;
  }

  const body = await req.json().catch(() => null);
  const clinicId = typeof body?.clinicId === 'string' ? body.clinicId.trim() : '';

  if (!clinicId) {
    return NextResponse.json({ error: 'Clinica selectată este invalidă.' }, { status: 400 });
  }

  if (clinicId === context.session.clinicId) {
    const apiResponse = NextResponse.json({
      ok: true,
      session: context.session,
    });
    applyAuthContextCookies(apiResponse, context);
    return apiResponse;
  }

  const nextSession = await activateClinicForUser(
    context.session.userId,
    context.session.email,
    clinicId
  );

  if (!nextSession) {
    return NextResponse.json(
      { error: 'Nu ai acces la clinica selectată.' },
      { status: 403 }
    );
  }

  if (!nextSession.clinicAccessible) {
    return NextResponse.json(
      { error: 'Clinica selectată este suspendată sau perioada de grație a expirat.' },
      { status: 403 }
    );
  }

  const apiResponse = NextResponse.json({
    ok: true,
    session: nextSession,
  });
  applyAuthContextCookies(apiResponse, context);
  await persistAuthSession(apiResponse, {
    userId: nextSession.userId,
    email: nextSession.email,
    clinicId: nextSession.clinicId,
  });
  return apiResponse;
}
