'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setStatus('sending');

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Eroare la trimiterea emailului.');
      }

      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la trimiterea emailului.');
      setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Resetare parolă</h1>
          <p className="mt-2 text-sm text-slate-600">
            Introdu emailul asociat contului tău și îți vom trimite un link pentru resetarea parolei.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {status === 'done' ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Emailul de resetare a fost trimis. Verifică inbox-ul.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {status === 'sending' ? 'Se trimite...' : 'Trimite email de resetare'}
            </button>
          </form>
        )}

        <p className="text-xs text-slate-500">
          Ai deja cont?
          {' '}
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Autentifică-te
          </Link>
        </p>
      </div>
    </div>
  );
}
