'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

interface RegisterFormState {
  clinicName: string;
  legalName: string;
  cuiCif: string;
  tradeRegisterNumber: string;
  isVatPayer: boolean;
  billingAddress: string;
  county: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptDpa: boolean;
}

const initialState: RegisterFormState = {
  clinicName: '',
  legalName: '',
  cuiCif: '',
  tradeRegisterNumber: '',
  isVatPayer: false,
  billingAddress: '',
  county: '',
  city: '',
  contactEmail: '',
  contactPhone: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
  acceptPrivacy: false,
  acceptDpa: false,
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormState>(initialState);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function setField<K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Parola și confirmarea parolei trebuie să fie identice.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicName: form.clinicName,
          legalName: form.legalName,
          cuiCif: form.cuiCif,
          tradeRegisterNumber: form.tradeRegisterNumber,
          isVatPayer: form.isVatPayer,
          billingAddress: form.billingAddress,
          county: form.county,
          city: form.city,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          adminFirstName: form.adminFirstName,
          adminLastName: form.adminLastName,
          adminEmail: form.adminEmail,
          password: form.password,
          acceptTerms: form.acceptTerms,
          acceptPrivacy: form.acceptPrivacy,
          acceptDpa: form.acceptDpa,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? 'Nu am putut crea clinica.');
        return;
      }

      router.push(data.redirect ?? `/login?email=${encodeURIComponent(form.adminEmail)}`);
    } catch {
      setError('Eroare de rețea. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#f8fafc_0%,#ecfeff_45%,#fff7ed_100%)] px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-white/70 bg-white/90 backdrop-blur shadow-[0_30px_80px_rgba(15,23,42,0.12)] overflow-hidden">
        <div className="grid lg:grid-cols-[0.9fr,1.1fr]">
          <div className="bg-slate-950 px-8 py-10 text-white">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
              C
            </div>
            <h1 className="mt-8 text-3xl font-bold leading-tight">Înregistrează o clinică</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              V1 pornește cu România, trial de 30 de zile, 2 utilizatori maximum în trial și MFA obligatoriu pentru administratorul clinicii.
            </p>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
              <p className="font-semibold text-white">Ce se creează acum</p>
              <ul className="mt-3 space-y-2">
                <li>Contul administratorului clinicii</li>
                <li>Profilul juridic și datele de facturare</li>
                <li>Trial-ul inițial în EUR</li>
                <li>Contextul clinicii pentru accesul în aplicație</li>
              </ul>
            </div>
            <p className="mt-8 text-sm text-slate-400">
              Ai deja cont?
              {' '}
              <Link href="/login" className="font-medium text-white hover:underline">
                Intră în platformă
              </Link>
            </p>
          </div>

          <div className="px-8 py-10">
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Clinică
                  </h2>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Nume clinică</span>
                  <input
                    value={form.clinicName}
                    onChange={(event) => setField('clinicName', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Denumire legală</span>
                  <input
                    value={form.legalName}
                    onChange={(event) => setField('legalName', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">CUI / CIF</span>
                  <input
                    value={form.cuiCif}
                    onChange={(event) => setField('cuiCif', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Nr. Registrul Comerțului</span>
                  <input
                    value={form.tradeRegisterNumber}
                    onChange={(event) => setField('tradeRegisterNumber', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Adresă de facturare</span>
                  <input
                    value={form.billingAddress}
                    onChange={(event) => setField('billingAddress', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Județ</span>
                  <input
                    value={form.county}
                    onChange={(event) => setField('county', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Oraș</span>
                  <input
                    value={form.city}
                    onChange={(event) => setField('city', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Email contact clinică</span>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => setField('contactEmail', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Telefon contact clinică</span>
                  <input
                    value={form.contactPhone}
                    onChange={(event) => setField('contactPhone', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="inline-flex items-center gap-3 text-sm text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isVatPayer}
                    onChange={(event) => setField('isVatPayer', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Clinica este plătitoare de TVA
                </label>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Administrator clinică
                  </h2>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Prenume</span>
                  <input
                    value={form.adminFirstName}
                    onChange={(event) => setField('adminFirstName', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Nume</span>
                  <input
                    value={form.adminLastName}
                    onChange={(event) => setField('adminLastName', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Email administrator</span>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(event) => setField('adminEmail', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Parolă</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setField('password', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Confirmă parola</span>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => setField('confirmPassword', event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
              </section>

              <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <label className="inline-flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(event) => setField('acceptTerms', event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  Accept
                  {' '}
                  <Link href="/legal/terms" className="font-medium text-slate-900 hover:underline">
                    Termenii și condițiile
                  </Link>
                </label>
                <label className="inline-flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.acceptPrivacy}
                    onChange={(event) => setField('acceptPrivacy', event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  Accept
                  {' '}
                  <Link href="/legal/privacy" className="font-medium text-slate-900 hover:underline">
                    Politica de confidențialitate
                  </Link>
                </label>
                <label className="inline-flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.acceptDpa}
                    onChange={(event) => setField('acceptDpa', event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  Accept
                  {' '}
                  <Link href="/legal/dpa" className="font-medium text-slate-900 hover:underline">
                    Acordul de prelucrare a datelor
                  </Link>
                </label>
              </section>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Se configurează clinica...' : 'Creează clinica și pornește trialul'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
