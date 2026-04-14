'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useMemo, useState } from 'react';
import { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

function LoginForm() {
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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Hero Image */}
      <div className="relative w-full md:w-[55%] h-[35vh] md:h-screen">
        <Image
          src="/images/hero-vet.jpg"
          alt="Veterinar îngrijind un câine golden retriever într-o clinică modernă"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-white"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.7 2 3.4V21a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V9.4c1.2-.7 2-1.9 2-3.4a4 4 0 0 0-4-4Z" />
                <path d="M5.5 10a2.5 2.5 0 0 0-2.5 2.5c0 1.1.7 2 1.7 2.4" />
                <path d="M18.5 10a2.5 2.5 0 0 1 2.5 2.5c0 1.1-.7 2-1.7 2.4" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white drop-shadow-lg">
              CanisVET
            </span>
          </div>

          {/* Tagline */}
          <p className="text-sm text-white/80 drop-shadow-md max-w-xs">
            Îngrijire dedicată, tehnologie modernă.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex-1 flex flex-col items-center justify-center bg-[#fdfbf7] px-6 py-12 md:px-12 md:w-[45%]">
        <div className="w-full max-w-[400px]">
          {/* Greeting */}
          <p className="text-sm font-medium text-slate-500">Bine ai revenit</p>
          
          {/* Heading */}
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Autentificare
          </h1>
          
          {/* Subheading */}
          <p className="mt-2 text-sm text-slate-500">
            Accesează contul clinicii tale
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5">
            {/* Email Input */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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

            {/* Password Input */}
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Parolă"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-700/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {/* Forgot Password Link */}
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs text-amber-800 hover:underline"
                >
                  Ai uitat parola?
                </Link>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-700 to-orange-800 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:shadow-xl hover:shadow-amber-800/20 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Se autentifică...
                </span>
              ) : (
                'Autentificare'
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-sm text-slate-500">
            Nu ai cont pentru clinică?{' '}
            <Link
              href="/register"
              className="font-medium text-amber-800 hover:underline"
            >
              Înregistrează clinica
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-xs text-slate-400">
            🔒 Conexiune securizată • GDPR
          </p>
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
