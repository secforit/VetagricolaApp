import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import { cancelClinicInvite } from '@/lib/team';

function forbiddenResponse() {
  return NextResponse.json(
    { error: 'Doar administratorii clinicii pot gestiona invitațiile.' },
    { status: 403 }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    return forbiddenResponse();
  }

  const { id } = await params;

  try {
    await cancelClinicInvite(context.session.clinicId, id);
    const apiResponse = NextResponse.json({ ok: true });
    applyAuthContextCookies(apiResponse, context);
    return apiResponse;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nu am putut anula invitația.',
      },
      { status: 400 }
    );
  }
}
