import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/db';
import { createClinicForUser } from '@/lib/tenant';
import { normalizeEmail, validateClinicSetupPayload } from '@/lib/clinicSetup';
import { createEmailToken } from '@/lib/emailToken';
import { sendVerificationEmail } from '@/lib/email';

const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX_ATTEMPTS = 8;
const registerAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isRegisterRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = registerAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    return false;
  }

  return entry.count >= REGISTER_MAX_ATTEMPTS;
}

function recordRegisterAttempt(ip: string) {
  const now = Date.now();
  const entry = registerAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    registerAttempts.set(ip, { count: 1, resetAt: now + REGISTER_WINDOW_MS });
    return;
  }

  entry.count += 1;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validateRegisterPayload(body: Record<string, unknown>) {
  const clinic = validateClinicSetupPayload(body);
  if (!clinic.ok) {
    return clinic;
  }

  const adminFirstName = readText(body.adminFirstName);
  const adminLastName = readText(body.adminLastName);
  const adminEmail = normalizeEmail(readText(body.adminEmail));
  const password = typeof body.password === 'string' ? body.password : '';

  if (!adminFirstName || !adminLastName || !adminEmail || !password) {
    return { ok: false as const, error: 'Completează toate câmpurile obligatorii.' };
  }

  if (password.length < 10) {
    return { ok: false as const, error: 'Parola trebuie să aibă cel puțin 10 caractere.' };
  }

  return {
    ok: true as const,
    data: {
      ...clinic.data,
      adminFirstName,
      adminLastName,
      adminEmail,
      password,
    },
  };
}

function getFriendlyRegisterError(error: unknown) {
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
    message: 'Nu am putut finaliza înregistrarea clinicii.',
  };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (isRegisterRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Prea multe încercări de înregistrare. Încearcă din nou mai târziu.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Payload invalid.' }, { status: 400 });
  }

  const validated = validateRegisterPayload(body);
  if (!validated.ok) {
    recordRegisterAttempt(ip);
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const admin = getAdminDb();
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: validated.data.adminEmail,
    password: validated.data.password,
    email_confirm: false,
    user_metadata: {
      first_name: validated.data.adminFirstName,
      last_name: validated.data.adminLastName,
    },
  });

  if (authError || !authUser.user) {
    recordRegisterAttempt(ip);
    return NextResponse.json(
      { error: authError?.message ?? 'Nu am putut crea contul administratorului.' },
      { status: 400 }
    );
  }

  try {
    const session = await createClinicForUser({
      userId: authUser.user.id,
      email: validated.data.adminEmail,
      firstName: validated.data.adminFirstName,
      lastName: validated.data.adminLastName,
      data: validated.data,
    });

    const { token } = await createEmailToken({
      userId: authUser.user.id,
      email: validated.data.adminEmail,
      type: 'verification',
    });

    try {
      await sendVerificationEmail({
        to: validated.data.adminEmail,
        token,
        firstName: validated.data.adminFirstName,
      });
    } catch (emailError) {
      console.warn(
        '[register] verification email send failed:',
        emailError instanceof Error ? emailError.message : emailError
      );
    }
  } catch (error) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    recordRegisterAttempt(ip);
    const friendly = getFriendlyRegisterError(error);
    return NextResponse.json(
      { error: friendly.message },
      { status: friendly.status }
    );
  }

      return NextResponse.json({
        ok: true,
        redirect: `/login?email=${encodeURIComponent(validated.data.adminEmail)}`,
      });
}
