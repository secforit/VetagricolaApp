import { randomBytes } from 'crypto';
import prisma from './prisma';

const TOKEN_BYTES = 32;
const TOKEN_TTL_MINUTES = 45;

export type EmailTokenType = 'verification' | 'password_reset';

export async function createEmailToken(args: {
  userId: string;
  email: string;
  type: EmailTokenType;
}) {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_TTL_MINUTES);

  const record = await prisma.emailToken.create({
    data: {
      user_id: args.userId,
      email: args.email,
      token,
      type: args.type,
      expires_at: expiresAt,
    },
  });

  return { token: record.token, expiresAt };
}

export async function consumeEmailToken(token: string, type: EmailTokenType) {
  const record = await prisma.emailToken.findFirst({
    where: {
      token,
      type,
      used: false,
      expires_at: {
        gt: new Date(),
      },
    },
  });

  if (!record) {
    return null;
  }

  await prisma.emailToken.update({
    where: {
      id: record.id,
    },
    data: {
      used: true,
    },
  });

  return record;
}

export async function markPasswordResetUsed(userId: string) {
  await prisma.emailToken.updateMany({
    where: {
      user_id: userId,
      type: 'password_reset',
    },
    data: {
      used: true,
    },
  });
}
