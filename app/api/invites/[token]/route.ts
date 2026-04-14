import { NextRequest, NextResponse } from 'next/server';
import { getInviteDetailsByToken } from '@/lib/team';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await getInviteDetailsByToken(token);

  if (!invite) {
    return NextResponse.json({ error: 'Invitația nu a fost găsită.' }, { status: 404 });
  }

  return NextResponse.json(invite);
}
