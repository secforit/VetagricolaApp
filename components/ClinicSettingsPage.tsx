'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClinicTeamSection from './ClinicTeamSection';
import { AppSession, ClinicMembershipSummary, ClinicRole, ClinicStatus } from '@/lib/types';

interface ClinicSettingsPageProps {
  session: AppSession;
}

interface ClinicFormState {
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
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptDpa: boolean;
}

const initialForm = (email: string): ClinicFormState => ({
  clinicName: '',
  legalName: '',
  cuiCif: '',
  tradeRegisterNumber: '',
  isVatPayer: false,
  billingAddress: '',
  county: '',
  city: '',
  contactEmail: email,
  contactPhone: '',
  acceptTerms: false,
  acceptPrivacy: false,
  acceptDpa: false,
});

function getRoleLabel(role: ClinicRole) {
  switch (role) {
    case 'clinic_admin':
      return 'Administrator clinică';
    case 'vet':
      return 'Veterinar';
    case 'assistant':
      return 'Asistent';
    default:
      return 'Utilizator';
  }
}

function getStatusLabel(status: ClinicStatus) {
  switch (status) {
    case 'trial':
      return 'Trial';
    case 'active':
      return 'Activă';
    case 'past_due':
      return 'În grație / restantă';
    case 'canceled':
      return 'Anulată';
    default:
      return status;
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ClinicSettingsPage({ session }: ClinicSettingsPageProps) {
  const router = useRouter();
  const [clinics, setClinics] = useState<ClinicMembershipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingClinicId, setSwitchingClinicId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<ClinicFormState>(() => initialForm(session.email));
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadClinics() {
      setLoading(true);
      try {
        const response = await fetch('/api/account/clinics');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? 'Nu am putut încărca clinicile.');
        }

        if (active) {
          setClinics(payload.data ?? []);
        }
      } catch (error) {
        if (active) {
          setCreateError(error instanceof Error ? error.message : 'Nu am putut încărca clinicile.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadClinics();

    return () => {
      active = false;
    };
  }, []);

  function setField<K extends keyof ClinicFormState>(key: K, value: ClinicFormState[K]) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSwitch(clinicId: string) {
    if (!clinicId || clinicId === session.clinicId) {
      return;
    }

    setSwitchingClinicId(clinicId);
    setCreateError('');

    try {
      const response = await fetch('/api/account/active-clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut schimba clinica activă.');
      }

      router.push('/');
      router.refresh();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'Nu am putut schimba clinica activă.'
      );
      setSwitchingClinicId(null);
    }
  }

  async function handleCreateClinic(event: FormEvent) {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);

    try {
      const response = await fetch('/api/account/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut crea clinica.');
      }

      setCreateSuccess('Clinica a fost creată. Contextul activ a fost schimbat pe noua clinică.');
      setClinics(payload.clinics ?? []);
      setCreateForm(initialForm(session.email));
      router.push('/');
      router.refresh();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Nu am putut crea clinica.');
    } finally {
      setCreating(false);
    }
  }

  const currentClinic =
    clinics.find((clinic) => clinic.isActive) ??
    {
      clinicId: session.clinicId,
      clinicName: session.clinicName,
      role: session.role,
      isOwner: session.isOwner,
      clinicStatus: session.clinicStatus,
      trialEnd: session.trialEnd,
      graceEnd: session.graceEnd,
      clinicAccessible: session.clinicAccessible,
      isActive: true,
    };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Setări clinică</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Gestionează contextul clinicii active și creează alte clinici sub același cont.
          Noua clinică pornește automat cu trial de 30 de zile și 2 zile de grație.
        </p>
      </div>

      {(createError || createSuccess) && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm ${
            createError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {createError || createSuccess}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Clinica activă</h2>
            <p className="mt-1 text-sm text-slate-600">
              Toate datele și acțiunile din aplicație sunt filtrate după clinica selectată.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{currentClinic.clinicName}</div>
            <div>{getStatusLabel(currentClinic.clinicStatus)}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rol</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {getRoleLabel(currentClinic.role)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sfârșit trial</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(currentClinic.trialEnd)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sfârșit grație</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(currentClinic.graceEnd)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Clinicile mele</h2>
            <p className="mt-1 text-sm text-slate-600">
              Poți schimba rapid clinica activă dacă acest cont deține sau administrează mai multe clinici.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            {loading ? 'Se încarcă...' : `${clinics.length} clinici`}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(loading ? [] : clinics).map((clinic) => (
            <div
              key={clinic.clinicId}
              className={`rounded-2xl border px-5 py-4 ${
                clinic.isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{clinic.clinicName}</div>
                  <div className={`mt-1 text-sm ${clinic.isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                    {getRoleLabel(clinic.role)}
                    {clinic.isOwner ? ' • proprietar' : ''}
                  </div>
                </div>
                <div className={`text-xs font-medium ${clinic.isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {getStatusLabel(clinic.clinicStatus)}
                </div>
              </div>

              <div className={`mt-4 text-xs ${clinic.isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                Trial: {formatDate(clinic.trialEnd)} · Grație: {formatDate(clinic.graceEnd)}
              </div>

              <div className="mt-4">
                {clinic.isActive ? (
                  <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
                    Activă
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitch(clinic.clinicId)}
                    disabled={switchingClinicId === clinic.clinicId}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {switchingClinicId === clinic.clinicId ? 'Se schimbă...' : 'Comută pe această clinică'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {!loading && clinics.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
              Nu există alte clinici asociate contului.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Creează o clinică nouă</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Această clinică va fi creată sub același cont și va deveni automat clinica activă după salvare.
          </p>
        </div>

        <form onSubmit={handleCreateClinic} className="mt-6 flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Nume clinică</span>
              <input
                value={createForm.clinicName}
                onChange={(event) => setField('clinicName', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Denumire legală</span>
              <input
                value={createForm.legalName}
                onChange={(event) => setField('legalName', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">CUI / CIF</span>
              <input
                value={createForm.cuiCif}
                onChange={(event) => setField('cuiCif', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Nr. Registrul Comerțului</span>
              <input
                value={createForm.tradeRegisterNumber}
                onChange={(event) => setField('tradeRegisterNumber', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Adresă de facturare</span>
              <input
                value={createForm.billingAddress}
                onChange={(event) => setField('billingAddress', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Județ</span>
              <input
                value={createForm.county}
                onChange={(event) => setField('county', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Oraș</span>
              <input
                value={createForm.city}
                onChange={(event) => setField('city', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Email contact clinică</span>
              <input
                type="email"
                value={createForm.contactEmail}
                onChange={(event) => setField('contactEmail', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Telefon contact clinică</span>
              <input
                value={createForm.contactPhone}
                onChange={(event) => setField('contactPhone', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </label>
            <label className="inline-flex items-center gap-3 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={createForm.isVatPayer}
                onChange={(event) => setField('isVatPayer', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Clinica este plătitoare de TVA
            </label>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-3">
              <label className="inline-flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.acceptTerms}
                  onChange={(event) => setField('acceptTerms', event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                Accept
                {' '}
                <Link href="/legal/terms" className="font-medium text-slate-900 hover:underline">
                  termenii și condițiile
                </Link>
                {' '}
                pentru această clinică.
              </label>
              <label className="inline-flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.acceptPrivacy}
                  onChange={(event) => setField('acceptPrivacy', event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                Accept
                {' '}
                <Link href="/legal/privacy" className="font-medium text-slate-900 hover:underline">
                  politica de confidențialitate
                </Link>
                {' '}
                pentru această clinică.
              </label>
              <label className="inline-flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.acceptDpa}
                  onChange={(event) => setField('acceptDpa', event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                Accept
                {' '}
                <Link href="/legal/dpa" className="font-medium text-slate-900 hover:underline">
                  acordul de prelucrare a datelor
                </Link>
                {' '}
                pentru această clinică.
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {creating ? 'Se creează...' : 'Creează clinica'}
            </button>
          </div>
        </form>
      </section>

      <ClinicTeamSection session={session} />
    </div>
  );
}
