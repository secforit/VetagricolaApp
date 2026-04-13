import { cookies } from 'next/headers';
import ImportJobsPage from '@/components/ImportJobsPage';
import { getSessionFromCookieStore } from '@/lib/auth';

export default async function ImportsPage() {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieStore(cookieStore);

  if (!session) {
    return null;
  }

  return <ImportJobsPage session={session} />;
}
