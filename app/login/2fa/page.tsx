'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';

function TwoFactorForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') ?? '/';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Cod invalid');
        setCode('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Eroare de rețea, încercați din nou');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
  }

  const isExpiredError = error.includes('expirată');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-foreground) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />

      <div className="relative bg-card rounded-[var(--radius)] shadow-lg border border-border w-full max-w-sm p-8">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground mb-4">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Verificare 2FA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Introduceți codul din aplicația de autentificare
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cod de autentificare
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={e => handleCodeChange(e.target.value)}
              required
              autoComplete="one-time-code"
              maxLength={6}
              className="border border-input rounded-[var(--radius)] px-4 py-3 text-center text-2xl font-mono tracking-[0.4em] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
              placeholder="000000"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-[var(--radius)] px-4 py-2.5">
              {error}
              {isExpiredError && (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="block mt-1 underline font-medium"
                >
                  Înapoi la login
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="mt-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-[var(--radius)] py-2.5 text-sm transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Se verifică...
              </>
            ) : (
              'Verifică codul'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Înapoi la login
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Vetagricola Farm SRL &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense>
      <TwoFactorForm />
    </Suspense>
  );
}
