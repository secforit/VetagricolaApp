import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import { createBillingPortalSession } from '@/lib/billing';

function forbiddenResponse() {
  return NextResponse.json(
    { error: 'Doar administratorii clinicii pot deschide portalul de facturare.' },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req, {
    allowInaccessibleClinic: true,
  });
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    return forbiddenResponse();
  }

  try {
    const portal = await createBillingPortalSession({
      clinicId: context.session.clinicId,
      userId: context.session.userId,
    });

    const apiResponse = NextResponse.json({
      ok: true,
      portalUrl: portal.portalUrl,
    });
    applyAuthContextCookies(apiResponse, context);
    return apiResponse;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Nu am putut deschide portalul de facturare.',
      },
      { status: 400 }
    );
  }
}
