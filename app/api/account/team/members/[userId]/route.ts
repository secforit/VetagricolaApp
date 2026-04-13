import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import { removeClinicMember, updateClinicMemberRole } from '@/lib/team';
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    return forbiddenResponse();
  }

  const body = await req.json().catch(() => null);
  const role = body?.role;
  if (!isValidRole(role)) {
    return NextResponse.json({ error: 'Rol invalid.' }, { status: 400 });
  }

  const { userId } = await params;

  try {
    await updateClinicMemberRole({
      clinicId: context.session.clinicId,
      actingUserId: context.session.userId,
      targetUserId: userId,
      role,
    });

    const apiResponse = NextResponse.json({ ok: true });
    applyAuthContextCookies(apiResponse, context);
    return apiResponse;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nu am putut actualiza rolul.',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    return forbiddenResponse();
  }

  const { userId } = await params;

  try {
    await removeClinicMember({
      clinicId: context.session.clinicId,
      actingUserId: context.session.userId,
      targetUserId: userId,
    });

    const apiResponse = NextResponse.json({ ok: true });
    applyAuthContextCookies(apiResponse, context);
    return apiResponse;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nu am putut elimina utilizatorul.',
      },
      { status: 400 }
    );
  }
}
