import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { getAdminDb } from './db';
import { sendClinicInviteEmail } from './email';
import prisma from './prisma';
import { isClinicAccessible } from './tenant';
import { ClinicRole, ClinicTeamInvite, ClinicTeamMember, ClinicTeamSnapshot } from './types';
import { normalizeEmail } from './clinicSetup';

const INVITE_TTL_DAYS = 7;

function getFullName(firstName: string | null, lastName: string | null) {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

function getInviteStatus(expiresAt: Date, acceptedAt: Date | null): ClinicTeamInvite['status'] {
  if (acceptedAt) {
    return 'accepted';
  }

  return expiresAt.getTime() > Date.now() ? 'pending' : 'expired';
}

function buildInviteExpiry(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
  return expiresAt;
}

function isValidRole(value: unknown): value is ClinicRole {
  return value === 'clinic_admin' || value === 'vet' || value === 'assistant';
}

function getFriendlyTeamError(error: unknown, fallback: string) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return 'Acest email există deja în platformă sau invitația este duplicată.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

async function getClinicLimits(clinicId: string) {
  const [clinic, settings, memberCount, pendingInviteCount] = await Promise.all([
    prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        status: true,
        grace_end: true,
      },
    }),
    prisma.clinicSetting.findUnique({
      where: { clinic_id: clinicId },
      select: {
        trial_user_limit: true,
      },
    }),
    prisma.userClinic.count({
      where: { clinic_id: clinicId },
    }),
    prisma.clinicInvite.count({
      where: {
        clinic_id: clinicId,
        accepted_at: null,
        expires_at: {
          gt: new Date(),
        },
      },
    }),
  ]);

  if (!clinic) {
    throw new Error('Clinica nu a fost găsită.');
  }

  return {
    clinic,
    trialUserLimit: settings?.trial_user_limit ?? 2,
    memberCount,
    pendingInviteCount,
    clinicAccessible: isClinicAccessible(clinic.status, clinic.grace_end.toISOString()),
  };
}

function assertInviteCapacity(args: {
  clinicStatus: string;
  trialUserLimit: number;
  memberCount: number;
  pendingInviteCount: number;
}) {
  if (args.clinicStatus !== 'trial') {
    return;
  }

  if (args.memberCount + args.pendingInviteCount >= args.trialUserLimit) {
    throw new Error(
      `Clinica este în trial și poate avea maximum ${args.trialUserLimit} utilizatori activi sau invitați.`
    );
  }
}

function assertAcceptanceCapacity(args: {
  clinicStatus: string;
  trialUserLimit: number;
  memberCount: number;
}) {
  if (args.clinicStatus !== 'trial') {
    return;
  }

  if (args.memberCount >= args.trialUserLimit) {
    throw new Error(
      `Clinica este în trial și a atins limita de ${args.trialUserLimit} utilizatori.`
    );
  }
}

export async function listClinicTeam(clinicId: string): Promise<ClinicTeamSnapshot> {
  const [membershipRows, invites, settings, clinic] = await Promise.all([
    prisma.userClinic.findMany({
      where: { clinic_id: clinicId },
      select: {
        user_id: true,
        role: true,
        is_owner: true,
        created_at: true,
      },
      orderBy: [{ is_owner: 'desc' }, { created_at: 'asc' }],
    }),
    prisma.clinicInvite.findMany({
      where: {
        clinic_id: clinicId,
        accepted_at: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
        expires_at: true,
        accepted_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    }),
    prisma.clinicSetting.findUnique({
      where: { clinic_id: clinicId },
      select: {
        trial_user_limit: true,
      },
    }),
    prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { status: true },
    }),
  ]);

  const profileRows =
    membershipRows.length > 0
      ? await prisma.profile.findMany({
          where: {
            user_id: {
              in: membershipRows.map((row) => row.user_id),
            },
          },
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
            full_name: true,
          },
        })
      : [];

  const profileMap = new Map(profileRows.map((row) => [row.user_id, row]));

  const members: ClinicTeamMember[] = membershipRows.map((membership) => {
    const profile = profileMap.get(membership.user_id);
    const fullName =
      profile?.full_name ?? getFullName(profile?.first_name ?? null, profile?.last_name ?? null);

    return {
      userId: membership.user_id,
      email: profile?.email ?? '',
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      fullName,
      role: membership.role,
      isOwner: membership.is_owner,
      createdAt: membership.created_at.toISOString(),
    };
  });

  const inviteRows: ClinicTeamInvite[] = invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.created_at.toISOString(),
    expiresAt: invite.expires_at.toISOString(),
    acceptedAt: invite.accepted_at?.toISOString() ?? null,
    status: getInviteStatus(invite.expires_at, invite.accepted_at),
  }));

  const pendingInviteCount = inviteRows.filter((invite) => invite.status === 'pending').length;

  return {
    members,
    invites: inviteRows,
    trialUserLimit: settings?.trial_user_limit ?? 2,
    activeUserCount: members.length,
    pendingInviteCount,
    isTrial: clinic?.status === 'trial',
  };
}

export async function createClinicInvite(args: {
  clinicId: string;
  invitedByUserId: string;
  inviterName: string;
  email: string;
  role: ClinicRole;
  inviteBaseUrl: string;
}) {
  if (!isValidRole(args.role)) {
    throw new Error('Rolul selectat este invalid.');
  }

  const email = normalizeEmail(args.email);
  if (!email) {
    throw new Error('Emailul invitatului este obligatoriu.');
  }

  const [limits, existingProfile, existingInvite] = await Promise.all([
    getClinicLimits(args.clinicId),
    prisma.profile.findUnique({
      where: { email },
      select: {
        user_id: true,
      },
    }),
    prisma.clinicInvite.findFirst({
      where: {
        clinic_id: args.clinicId,
        email,
        accepted_at: null,
      },
      select: {
        id: true,
        expires_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    }),
  ]);

  if (!limits.clinicAccessible) {
    throw new Error('Clinica nu poate trimite invitații cât timp este suspendată.');
  }

  const now = new Date();
  const reusingPendingInvite = Boolean(
    existingInvite && existingInvite.expires_at.getTime() > now.getTime()
  );

  assertInviteCapacity({
    clinicStatus: limits.clinic.status,
    trialUserLimit: limits.trialUserLimit,
    memberCount: limits.memberCount,
    pendingInviteCount: reusingPendingInvite
      ? Math.max(0, limits.pendingInviteCount - 1)
      : limits.pendingInviteCount,
  });

  if (existingProfile) {
    const memberships = await prisma.userClinic.findMany({
      where: {
        user_id: existingProfile.user_id,
      },
      select: {
        clinic_id: true,
      },
    });

    if (memberships.some((membership) => membership.clinic_id === args.clinicId)) {
      throw new Error('Utilizatorul face deja parte din clinică.');
    }

    throw new Error(
      'Emailul are deja un cont CanisVET. Invitarea conturilor existente nu este disponibilă încă.'
    );
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = buildInviteExpiry(now);

  const invite =
    reusingPendingInvite
      ? await prisma.clinicInvite.update({
          where: { id: existingInvite!.id },
          data: {
            role: args.role,
            invited_by: args.invitedByUserId,
            token,
            expires_at: expiresAt,
          },
          select: {
            id: true,
            email: true,
            role: true,
            created_at: true,
            expires_at: true,
            accepted_at: true,
          },
        })
      : await prisma.clinicInvite.create({
          data: {
            clinic_id: args.clinicId,
            email,
            role: args.role,
            invited_by: args.invitedByUserId,
            token,
            expires_at: expiresAt,
          },
          select: {
            id: true,
            email: true,
            role: true,
            created_at: true,
            expires_at: true,
            accepted_at: true,
          },
        });

  const inviteUrl = `${args.inviteBaseUrl.replace(/\/$/, '')}/invite/${token}`;

  await sendClinicInviteEmail({
    to: invite.email,
    clinicName: limits.clinic.name,
    role: invite.role,
    inviteUrl,
    inviterName: args.inviterName,
    expiresAt,
  });

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.created_at.toISOString(),
    expiresAt: invite.expires_at.toISOString(),
    acceptedAt: invite.accepted_at?.toISOString() ?? null,
    status: getInviteStatus(invite.expires_at, invite.accepted_at),
  } satisfies ClinicTeamInvite;
}

export async function cancelClinicInvite(clinicId: string, inviteId: string) {
  const deleted = await prisma.clinicInvite.deleteMany({
    where: {
      id: inviteId,
      clinic_id: clinicId,
      accepted_at: null,
    },
  });

  if (deleted.count === 0) {
    throw new Error('Invitația nu a fost găsită.');
  }
}

export async function updateClinicMemberRole(args: {
  clinicId: string;
  actingUserId: string;
  targetUserId: string;
  role: ClinicRole;
}) {
  if (!isValidRole(args.role)) {
    throw new Error('Rolul selectat este invalid.');
  }

  const membership = await prisma.userClinic.findFirst({
    where: {
      clinic_id: args.clinicId,
      user_id: args.targetUserId,
    },
    select: {
      user_id: true,
      is_owner: true,
      role: true,
    },
  });

  if (!membership) {
    throw new Error('Utilizatorul nu a fost găsit în această clinică.');
  }

  if (membership.is_owner) {
    throw new Error('Rolul proprietarului clinicii nu poate fi modificat.');
  }

  if (membership.user_id === args.actingUserId) {
    throw new Error('Nu îți poți modifica propriul rol din această interfață.');
  }

  await prisma.userClinic.updateMany({
    where: {
      clinic_id: args.clinicId,
      user_id: args.targetUserId,
    },
    data: {
      role: args.role,
    },
  });
}

export async function removeClinicMember(args: {
  clinicId: string;
  actingUserId: string;
  targetUserId: string;
}) {
  const membership = await prisma.userClinic.findFirst({
    where: {
      clinic_id: args.clinicId,
      user_id: args.targetUserId,
    },
    select: {
      user_id: true,
      is_owner: true,
    },
  });

  if (!membership) {
    throw new Error('Utilizatorul nu a fost găsit în această clinică.');
  }

  if (membership.is_owner) {
    throw new Error('Proprietarul clinicii nu poate fi eliminat.');
  }

  if (membership.user_id === args.actingUserId) {
    throw new Error('Nu te poți elimina singur din clinică.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.userClinic.deleteMany({
      where: {
        clinic_id: args.clinicId,
        user_id: args.targetUserId,
      },
    });

    const profile = await tx.profile.findUnique({
      where: {
        user_id: args.targetUserId,
      },
      select: {
        active_clinic_id: true,
      },
    });

    if (profile?.active_clinic_id === args.clinicId) {
      await tx.profile.update({
        where: {
          user_id: args.targetUserId,
        },
        data: {
          active_clinic_id: null,
        },
      });
    }
  });
}

export async function getInviteDetailsByToken(token: string) {
  const invite = await prisma.clinicInvite.findUnique({
    where: { token },
    select: {
      id: true,
      clinic_id: true,
      email: true,
      role: true,
      expires_at: true,
      accepted_at: true,
    },
  });

  if (!invite) {
    return null;
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: invite.clinic_id },
    select: {
      name: true,
      status: true,
      grace_end: true,
    },
  });

  if (!clinic) {
    return null;
  }

  return {
    clinicId: invite.clinic_id,
    clinicName: clinic.name,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expires_at.toISOString(),
    acceptedAt: invite.accepted_at?.toISOString() ?? null,
    status: getInviteStatus(invite.expires_at, invite.accepted_at),
    clinicAccessible: isClinicAccessible(clinic.status, clinic.grace_end.toISOString()),
  };
}

export async function acceptClinicInvite(args: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}) {
  const firstName = args.firstName.trim();
  const lastName = args.lastName.trim();
  const password = args.password;

  if (!firstName || !lastName || !password) {
    throw new Error('Completează toate câmpurile obligatorii.');
  }

  if (password.length < 10) {
    throw new Error('Parola trebuie să aibă cel puțin 10 caractere.');
  }

  const invite = await prisma.clinicInvite.findUnique({
    where: { token: args.token },
    select: {
      id: true,
      clinic_id: true,
      email: true,
      role: true,
      expires_at: true,
      accepted_at: true,
    },
  });

  if (!invite) {
    throw new Error('Invitația nu a fost găsită.');
  }

  if (invite.accepted_at) {
    throw new Error('Invitația a fost deja folosită.');
  }

  if (invite.expires_at.getTime() <= Date.now()) {
    throw new Error('Invitația a expirat.');
  }

  const [limits, existingProfile] = await Promise.all([
    getClinicLimits(invite.clinic_id),
    prisma.profile.findUnique({
      where: {
        email: invite.email,
      },
      select: {
        user_id: true,
      },
    }),
  ]);

  if (!limits.clinicAccessible) {
    throw new Error('Clinica nu poate accepta invitații în acest moment.');
  }

  if (existingProfile) {
    throw new Error(
      'Emailul are deja un cont CanisVET. Acceptarea invitațiilor pentru conturi existente nu este disponibilă încă.'
    );
  }

  assertAcceptanceCapacity({
    clinicStatus: limits.clinic.status,
    trialUserLimit: limits.trialUserLimit,
    memberCount: limits.memberCount,
  });

  const admin = getAdminDb();
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? 'Nu am putut crea contul utilizatorului.');
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.profile.create({
        data: {
          user_id: authUser.user.id,
          email: invite.email,
          first_name: firstName,
          last_name: lastName,
          full_name: getFullName(firstName, lastName),
          active_clinic_id: invite.clinic_id,
        },
      });

      await tx.userClinic.create({
        data: {
          user_id: authUser.user.id,
          clinic_id: invite.clinic_id,
          role: invite.role,
          is_owner: false,
        },
      });

      await tx.clinicInvite.update({
        where: { id: invite.id },
        data: {
          accepted_at: new Date(),
        },
      });
    });
  } catch (error) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(getFriendlyTeamError(error, 'Nu am putut accepta invitația.'));
  }

  return {
    email: invite.email,
  };
}
