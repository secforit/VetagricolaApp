import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext, persistAuthSession } from '@/lib/auth';
import { validateClinicSetupPayload } from '@/lib/clinicSetup';
import { createClinicForUser, listClinicMembershipsForUser } from '@/lib/tenant';

function getFriendlyClinicError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return {
      status: 409,
      message: 'Există deja o clinică înregistrată cu acest CUI/CIF.',
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: 'Nu am putut crea clinica.',
  };
}

export async function GET(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req, {
    allowInaccessibleClinic: true,
  });
  if (!context) {
    return response!;
  }

  const clinics = await listClinicMembershipsForUser(context.session.userId, context.session.clinicId);
  const apiResponse = NextResponse.json({
    data: clinics,
  });
  applyAuthContextCookies(apiResponse, context);
  return apiResponse;
}

export async function POST(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req, {
    allowInaccessibleClinic: true,
  });
  if (!context) {
    return response!;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Payload invalid.' }, { status: 400 });
  }

  const validated = validateClinicSetupPayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const newSession = await createClinicForUser({
      userId: context.session.userId,
      email: context.session.email,
      firstName: context.session.firstName,
      lastName: context.session.lastName,
      data: validated.data,
    });

    const clinics = await listClinicMembershipsForUser(context.session.userId, newSession.clinicId);
    const apiResponse = NextResponse.json({
      ok: true,
      session: newSession,
      clinics,
    });
    applyAuthContextCookies(apiResponse, context);
    await persistAuthSession(apiResponse, {
      userId: newSession.userId,
      email: newSession.email,
      clinicId: newSession.clinicId,
    });
    return apiResponse;
  } catch (error) {
    const friendly = getFriendlyClinicError(error);
    return NextResponse.json({ error: friendly.message }, { status: friendly.status });
  }
}
