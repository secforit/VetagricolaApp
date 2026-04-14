import { cookies } from 'next/headers';
import ClinicSettingsPage from '@/components/ClinicSettingsPage';
import { getSessionFromCookieStore } from '@/lib/auth';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieStore(cookieStore);

  if (!session) {
    return null;
  }

  return <ClinicSettingsPage session={session} />;
}
