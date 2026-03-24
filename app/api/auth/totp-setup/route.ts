import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import QRCode from 'qrcode';
import getDb from '@/lib/db';

// Returns the TOTP secret + QR URL for the pending user (requires valid pending token)
export async function GET(req: NextRequest) {
  const pendingToken = req.cookies.get('auth_pending')?.value;
  if (!pendingToken) {
    return NextResponse.json({ error: 'Sesiune expirată' }, { status: 401 });
  }

  const jwtSecret = new TextEncoder().encode(process.env.AUTH_SECRET);
  let username: string;
  try {
    const { payload } = await jwtVerify(pendingToken, jwtSecret);
    if (payload.step !== 'totp_setup' || typeof payload.username !== 'string') {
      throw new Error('Invalid token');
    }
    username = payload.username;
  } catch {
    return NextResponse.json({ error: 'Sesiune expirată' }, { status: 401 });
  }

  // Get the unverified secret from DB
  const { data: row } = await getDb()
    .from('totp_secrets')
    .select('secret')
    .eq('username', username)
    .eq('verified', false)
    .single();

  if (!row) {
    return NextResponse.json({ error: 'TOTP deja configurat' }, { status: 400 });
  }

  const otpauthUrl = `otpauth://totp/CanisVet:${encodeURIComponent(username)}?secret=${row.secret}&issuer=CanisVet`;
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 256, margin: 2 });

  return NextResponse.json({
    secret: row.secret,
    otpauth_url: otpauthUrl,
    qr_url: qrDataUrl,
  });
}
