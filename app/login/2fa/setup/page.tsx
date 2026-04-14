'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

interface SetupData {
  secret: string;
  otpauth_url: string;
}

function TotpSetupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawFrom = params.get('from') ?? '/';
  const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/';

  const [setup, setSetup] = useState<SetupData | null>(null);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showManualSecret, setShowManualSecret] = useState(false);

  useEffect(() => {
    fetch('/api/auth/totp-setup')
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? 'Sesiune expirată');
        }

        return response.json();
      })
      .then((data: SetupData) => {
        setSetup(data);
        setLoadingSetup(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoadingSetup(false);
      });
  }, []);

  useEffect(() => {
    if (setup) {
      inputRef.current?.focus();
    }
  }, [setup]);

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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Cod invalid.');
        setCode('');
        inputRef.current?.focus();
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

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, 6));
  }

  async function copySecret() {
    if (!setup) {
      return;
    }

    try {
      await navigator.clipboard.writeText(setup.secret);
    } catch {
      setError('Secretul nu a putut fi copiat. Copiază-l manual.');
    }
  }

  async function copyOtpAuthUrl() {
    if (!setup) {
      return;
    }

    try {
      await navigator.clipboard.writeText(setup.otpauth_url);
    } catch {
      setError('Linkul QR nu a putut fi copiat.');
    }
  }

  if (loadingSetup) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#fff7ed_100%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#fff7ed_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 backdrop-blur shadow-[0_30px_80px_rgba(15,23,42,0.12)] p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Activează MFA</h1>
          <p className="mt-2 text-sm text-slate-500">
            Adaugă secretul în Google Authenticator, 1Password sau Authy, apoi confirmă cu primul cod.
          </p>
        </div>

        {setup ? (
          <>
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm text-cyan-900">
              <p className="font-semibold">Instrucțiuni activare MFA</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Deschide aplicația de autentificare (Google Authenticator, Authy, 1Password).</li>
                <li>Adaugă un cont nou și alege opțiunea de scanare QR.</li>
                <li>Scanează codul QR de mai jos (sau folosește setup manual dacă nu poți scana).</li>
                <li>Introdu codul de 6 cifre generat de aplicație și apasă „Confirmă MFA”.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Scanare QR
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Scanează codul în Google Authenticator, 1Password sau Authy.
              </p>
              <div className="mt-3 flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(setup.otpauth_url)}`}
                  alt="QR MFA"
                  className="h-[220px] w-[220px] rounded-xl border border-slate-200 bg-white p-2"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copyOtpAuthUrl}
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  Copiază link QR
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualSecret((current) => !current)}
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  {showManualSecret ? 'Ascunde setup manual' : 'Arată setup manual'}
                </button>
              </div>
            </div>

            {showManualSecret && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Secret MFA (fallback manual)
                </p>
                <code className="mt-2 block break-all font-mono text-sm font-semibold text-slate-900">
                  {setup.secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="mt-2 text-sm font-medium text-slate-900 hover:underline"
                >
                  Copiază secretul
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Cod de verificare
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => handleCodeChange(event.target.value)}
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="000000"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Se activează...
                  </>
                ) : (
                  'Confirmă MFA'
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Înapoi la login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TotpSetupPage() {
  return (
    <Suspense>
      <TotpSetupForm />
    </Suspense>
  );
}
