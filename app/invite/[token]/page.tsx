import AcceptInvitePage from '@/components/AcceptInvitePage';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AcceptInvitePage token={token} />;
}
