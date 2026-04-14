import { cookies } from 'next/headers';
import AppShell from '@/components/AppShell';
import { getSessionFromCookieStore } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieStore(cookieStore);

  return <AppShell session={session}>{children}</AppShell>;
}
