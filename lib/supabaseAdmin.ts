import { User } from '@supabase/supabase-js';
import { getAdminDb } from './db';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) {
    return null;
  }

  const admin = getAdminDb();
  let page = 1;
  const perPage = 200;

  while (page <= 25) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(error.message);
    }

    const users = data?.users ?? [];
    const match = users.find((entry) => normalizeEmail(entry.email ?? '') === targetEmail);
    if (match) {
      return match;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}
