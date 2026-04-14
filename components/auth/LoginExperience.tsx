'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

export default function LoginExperience() {
  const router = useRouter();
  const params = useSearchParams();
  const rawFrom = params.get('from') ?? '/';
  const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/';
  const initialEmail = useMemo(() => params.get('email') ?? '', [params]);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        setError(data.error ?? 'Autentificarea a esuat.');
        return;
      }

      if (data.requires2FA) {
        router.push(`${data.redirect}?from=${encodeURIComponent(from)}`);
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError('Eroare de retea. Incearca din nou.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="relative h-[35vh] w-full md:h-screen md:w-[55%]">
        <img
          src="/images/hero-vet.jpg"
          alt="Veterinar intr-o clinica moderna"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/30 via-slate-900/10 to-transparent" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-[#fdfbf7] px-6 py-12 md:w-[45%] md:px-12">
        <div className="w-full max-w-[400px]">
          <p className="text-sm font-medium text-slate-500">Bine ai revenit</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Autentificare
          </h1>
          <p className="mt-2 text-sm text-slate-500">Acceseaza contul clinicii tale</p>

          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="Email"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-700/10"
              />
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Parola"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-700/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? 'Ascunde parola' : 'Arata parola'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="mt-2 text-right">
                <Link href="/reset-password/request" className="text-xs text-amber-800 hover:underline">
                  Ai uitat parola?
                </Link>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-700 to-orange-800 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.01] hover:shadow-xl hover:shadow-amber-800/20 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Se autentifica...
                </span>
              ) : (
                'Autentificare'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Nu ai cont pentru clinica?{' '}
            <Link href="/register" className="font-medium text-amber-800 hover:underline">
              Inregistreaza clinica
            </Link>
          </p>

          <div className="mt-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Logo" className="h-48 w-48 object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
}
