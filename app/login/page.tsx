'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawFrom = params.get('from') ?? '/';
  const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/';
  const initialEmail = useMemo(() => params.get('email') ?? '', [params]);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Autentificarea a eșuat.');
        return;
      }

      if (data.requires2FA) {
        router.push(`${data.redirect}?from=${encodeURIComponent(from)}`);
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError('Eroare de rețea. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#fff7ed_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 backdrop-blur shadow-[0_30px_80px_rgba(15,23,42,0.12)] p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-2xl text-white">
            C
          </div>
          <h1 className="text-2xl font-bold text-slate-900">CanisVET</h1>
          <p className="mt-2 text-sm text-slate-500">
            Autentificare pentru clinici veterinare
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
              autoComplete="email"
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Parolă</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Se autentifică...' : 'Autentificare'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Nu ai cont pentru clinică?
          {' '}
          <Link href="/register" className="font-medium text-slate-900 hover:underline">
            Înregistrează clinica
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
