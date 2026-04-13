import Link from 'next/link';

async function verify(token: string) {
  const res = await fetch('http://localhost/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? 'Verificarea a eșuat.');
  }

  return true;
}

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    await verify(token);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Email confirmat</h1>
          <p className="mt-4 text-sm text-slate-600">
            Mulțumim! Emailul tău este acum confirmat. Te poți autentifica în platformă.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Mergi la login
          </Link>
        </div>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verificarea a eșuat.';
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-red-700">Link invalid</h1>
          <p className="mt-4 text-sm text-red-600">{message}</p>
        </div>
      </div>
    );
  }
}
