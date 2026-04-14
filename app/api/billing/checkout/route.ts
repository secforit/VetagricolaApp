import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import { createBillingCheckoutSession } from '@/lib/billing';

function forbiddenResponse() {
  return NextResponse.json(
    { error: 'Doar administratorii clinicii pot initia plata.' },
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
    const checkout = await createBillingCheckoutSession({
      clinicId: context.session.clinicId,
      userId: context.session.userId,
    });

    const apiResponse = NextResponse.json({
      ok: true,
      checkoutUrl: checkout.checkoutUrl,
      provider: checkout.provider,
      externalId: checkout.externalId,
      amountCents: checkout.amountCents,
      currency: checkout.currency,
    });
    applyAuthContextCookies(apiResponse, context);
    return apiResponse;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Nu am putut initializa checkout-ul.',
      },
      { status: 500 }
    );
  }
}
