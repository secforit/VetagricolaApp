import { NextRequest, NextResponse } from 'next/server';
import { acceptClinicInvite } from '@/lib/team';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json().catch(() => null);

  const firstName = typeof body?.firstName === 'string' ? body.firstName : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  try {
    const result = await acceptClinicInvite({
      token,
      firstName,
      lastName,
      password,
    });

    return NextResponse.json({
      ok: true,
      redirect: `/login?email=${encodeURIComponent(result.email)}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nu am putut accepta invitația.',
      },
      { status: 400 }
    );
  }
}
