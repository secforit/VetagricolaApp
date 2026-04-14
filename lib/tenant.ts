import speakeasy from 'speakeasy';
import { ClinicSetupPayload, buildTrialWindow, normalizeEmail } from './clinicSetup';
import prisma from './prisma';
import { AppSession, ClinicMembershipSummary, ClinicRole, ClinicStatus } from './types';

interface ProfileRow {
  email: string;
  first_name: string | null;
  last_name: string | null;
  active_clinic_id: string | null;
}

interface MembershipRow {
  clinic_id: string;
  role: ClinicRole;
  is_owner: boolean;
  created_at: Date;
}

interface ClinicRow {
  id: string;
  name: string;
  status: ClinicStatus;
  trial_end: Date;
  grace_end: Date;
}

export function isClinicAccessible(status: ClinicStatus, graceEnd: string | null): boolean {
  if (status === 'active') {
    return true;
  }

  if ((status === 'trial' || status === 'past_due') && graceEnd) {
    return new Date(graceEnd).getTime() > Date.now();
  }

  return false;
}

function getFullName(firstName: string | null, lastName: string | null): string | null {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

async function getProfile(userId: string): Promise<ProfileRow | null> {
  return prisma.profile.findUnique({
    where: { user_id: userId },
    select: {
      email: true,
      first_name: true,
      last_name: true,
      active_clinic_id: true,
    },
  });
}

async function getMemberships(userId: string): Promise<MembershipRow[]> {
  return prisma.userClinic.findMany({
    where: { user_id: userId },
    select: {
      clinic_id: true,
      role: true,
      is_owner: true,
      created_at: true,
    },
    orderBy: [{ is_owner: 'desc' }, { created_at: 'asc' }],
  });
}

async function getClinic(clinicId: string): Promise<ClinicRow | null> {
  return prisma.clinic.findUnique({
    where: { id: clinicId },
    select: {
      id: true,
      name: true,
      status: true,
      trial_end: true,
      grace_end: true,
    },
  });
}

export async function persistActiveClinic(userId: string, email: string, clinicId: string) {
  await prisma.profile.upsert({
    where: { user_id: userId },
    update: {
      email: normalizeEmail(email),
      active_clinic_id: clinicId,
    },
    create: {
      user_id: userId,
      email: normalizeEmail(email),
      active_clinic_id: clinicId,
    },
  });
}

function buildSession(
  userId: string,
  email: string,
  profile: ProfileRow | null,
  membership: MembershipRow,
  clinic: ClinicRow
): AppSession {
  const trialEnd = clinic.trial_end?.toISOString() ?? null;
  const graceEnd = clinic.grace_end?.toISOString() ?? null;

  return {
    userId,
    email: profile?.email ?? email,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    fullName: getFullName(profile?.first_name ?? null, profile?.last_name ?? null),
    clinicId: clinic.id,
    clinicName: clinic.name,
    role: membership.role,
    isOwner: membership.is_owner,
    clinicStatus: clinic.status,
    trialEnd,
    graceEnd,
    clinicAccessible: isClinicAccessible(clinic.status, graceEnd),
  };
}

export async function getPrimaryClinicContext(userId: string, email: string): Promise<AppSession | null> {
  const [profile, memberships] = await Promise.all([getProfile(userId), getMemberships(userId)]);

  if (memberships.length === 0) {
    return null;
  }

  const clinics = await prisma.clinic.findMany({
    where: {
      id: {
        in: memberships.map((membership) => membership.clinic_id),
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      trial_end: true,
      grace_end: true,
    },
  });

  const clinicMap = new Map(clinics.map((clinic) => [clinic.id, clinic]));
  const accessibleMemberships = memberships.filter((membership) => {
    const clinic = clinicMap.get(membership.clinic_id);
    if (!clinic) {
      return false;
    }

    return isClinicAccessible(clinic.status, clinic.grace_end.toISOString());
  });

  const activeMembership = memberships.find((membership) => membership.clinic_id === profile?.active_clinic_id);
  const activeAccessibleMembership = accessibleMemberships.find(
    (membership) => membership.clinic_id === profile?.active_clinic_id
  );

  const preferredMembership =
    activeAccessibleMembership ??
    accessibleMemberships.find((membership) => membership.is_owner) ??
    accessibleMemberships[0] ??
    activeMembership ??
    memberships.find((membership) => membership.is_owner) ??
    memberships[0];

  const clinic = clinicMap.get(preferredMembership.clinic_id);
  if (!clinic) {
    return null;
  }

  if (!profile?.active_clinic_id || profile.active_clinic_id !== preferredMembership.clinic_id) {
    await persistActiveClinic(userId, email, preferredMembership.clinic_id);
  }

  return buildSession(userId, email, profile, preferredMembership, clinic);
}

export async function getClinicContextForUser(
  userId: string,
  clinicId: string,
  email: string
): Promise<AppSession | null> {
  const [profile, memberships, clinic] = await Promise.all([
    getProfile(userId),
    getMemberships(userId),
    getClinic(clinicId),
  ]);

  if (!clinic) {
    return null;
  }

  const membership = memberships.find((entry) => entry.clinic_id === clinicId);
  if (!membership) {
    return null;
  }

  return buildSession(userId, email, profile, membership, clinic);
}

export async function listClinicMembershipsForUser(
  userId: string,
  activeClinicId: string
): Promise<ClinicMembershipSummary[]> {
  const memberships = await getMemberships(userId);
  if (memberships.length === 0) {
    return [];
  }

  const clinics = await prisma.clinic.findMany({
    where: {
      id: {
        in: memberships.map((membership) => membership.clinic_id),
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      trial_end: true,
      grace_end: true,
    },
  });

  const clinicMap = new Map(clinics.map((clinic) => [clinic.id, clinic]));

  const summaries = memberships.reduce<ClinicMembershipSummary[]>((acc, membership) => {
      const clinic = clinicMap.get(membership.clinic_id);
      if (!clinic) {
        return acc;
      }

      const trialEnd: string | null = clinic.trial_end?.toISOString() ?? null;
      const graceEnd: string | null = clinic.grace_end?.toISOString() ?? null;

      acc.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        role: membership.role,
        isOwner: membership.is_owner,
        clinicStatus: clinic.status,
        trialEnd,
        graceEnd,
        clinicAccessible: isClinicAccessible(clinic.status, graceEnd),
        isActive: clinic.id === activeClinicId,
      });

      return acc;
    }, []);

  return summaries;
}

export async function activateClinicForUser(
  userId: string,
  email: string,
  clinicId: string
): Promise<AppSession | null> {
  const session = await getClinicContextForUser(userId, clinicId, email);
  if (!session) {
    return null;
  }

  await persistActiveClinic(userId, email, clinicId);
  return getClinicContextForUser(userId, clinicId, email);
}

export async function createClinicForUser(args: {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  data: ClinicSetupPayload;
}): Promise<AppSession> {
  const now = new Date();
  const { trialStart, trialEnd, graceEnd } = buildTrialWindow(now);

  const clinic = await prisma.$transaction(async (tx) => {
    const createdClinic = await tx.clinic.create({
      data: {
        name: args.data.clinicName,
        legal_name: args.data.legalName,
        cui_cif: args.data.cuiCif,
        trade_register_number: args.data.tradeRegisterNumber,
        is_vat_payer: args.data.isVatPayer,
        billing_address: args.data.billingAddress,
        county: args.data.county,
        city: args.data.city,
        country_code: 'RO',
        contact_email: args.data.contactEmail,
        contact_phone: args.data.contactPhone,
        status: 'trial',
        currency: 'EUR',
        trial_started_at: trialStart,
        trial_end: trialEnd,
        grace_end: graceEnd,
        owner_user_id: args.userId,
        terms_accepted_at: now,
        privacy_accepted_at: now,
        dpa_accepted_at: now,
      },
      select: { id: true },
    });

    await tx.profile.upsert({
      where: { user_id: args.userId },
      update: {
        email: normalizeEmail(args.email),
        first_name: args.firstName,
        last_name: args.lastName,
        full_name: getFullName(args.firstName, args.lastName),
        active_clinic_id: createdClinic.id,
      },
      create: {
        user_id: args.userId,
        email: normalizeEmail(args.email),
        first_name: args.firstName,
        last_name: args.lastName,
        full_name: getFullName(args.firstName, args.lastName),
        active_clinic_id: createdClinic.id,
      },
    });

    await tx.userClinic.create({
      data: {
        user_id: args.userId,
        clinic_id: createdClinic.id,
        role: 'clinic_admin',
        is_owner: true,
      },
    });

    await tx.clinicSetting.create({
      data: {
        clinic_id: createdClinic.id,
        timezone: 'Europe/Bucharest',
        locale: 'ro-RO',
        trial_user_limit: 2,
      },
    });

    return createdClinic;
  });

  const session = await getClinicContextForUser(args.userId, clinic.id, args.email);
  if (!session) {
    throw new Error('Nu am putut încărca contextul noii clinici.');
  }

  return session;
}

export async function ensureAdminMfaFactor(userId: string, email: string) {
  const data = await prisma.authMfaFactor.findUnique({
    where: { user_id: userId },
    select: {
      secret: true,
      verified: true,
      email: true,
    },
  });

  if (data) {
    if (data.email !== email) {
      await prisma.authMfaFactor.update({
        where: { user_id: userId },
        data: { email },
      });
    }

    return {
      secret: data.secret,
      verified: data.verified,
      otpauthUrl:
        `otpauth://totp/CanisVET:${encodeURIComponent(email)}` +
        `?secret=${encodeURIComponent(data.secret)}&issuer=CanisVET`,
    };
  }

  const generated = speakeasy.generateSecret({
    issuer: 'CanisVET',
    name: `CanisVET:${email}`,
    length: 20,
  });

  await prisma.authMfaFactor.create({
    data: {
      user_id: userId,
      email,
      secret: generated.base32,
      verified: false,
    },
  });

  return {
    secret: generated.base32,
    verified: false,
    otpauthUrl: generated.otpauth_url ?? '',
  };
}
