'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

interface AcceptInvitePageProps {
  token: string;
}

interface InviteDetails {
  clinicName: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  status: 'pending' | 'accepted' | 'expired';
  clinicAccessible: boolean;
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'clinic_admin':
      return 'Administrator clinică';
    case 'vet':
      return 'Veterinar';
    case 'assistant':
      return 'Asistent';
    default:
      return role;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AcceptInvitePage({ token }: AcceptInvitePageProps) {
  const router = useRouter();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let active = true;

    async function loadInvite() {
      setLoading(true);
      try {
        const response = await fetch(`/api/invites/${token}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? 'Invitația nu este disponibilă.');
        }

        if (active) {
          setInvite(payload);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Invitația nu este disponibilă.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInvite();

    return () => {
      active = false;
    };
  }, [token]);

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Parola și confirmarea parolei trebuie să fie identice.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut accepta invitația.');
      }

      router.push(payload.redirect ?? '/login');
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Nu am putut accepta invitația.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const blocked =
    !invite ||
    invite.status !== 'pending' ||
    !invite.clinicAccessible;

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#f8fafc_0%,#eff6ff_45%,#fff7ed_100%)] px-4 py-10">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="grid lg:grid-cols-[0.9fr,1.1fr]">
          <div className="bg-slate-950 px-8 py-10 text-white">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
              C
            </div>
            <h1 className="mt-8 text-3xl font-bold leading-tight">Acceptă invitația CanisVET</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Creează contul de acces pentru clinica la care ai fost invitat(ă).
            </p>

            {invite && (
              <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
                <div className="font-semibold text-white">{invite.clinicName}</div>
                <div className="mt-2">{getRoleLabel(invite.role)}</div>
                <div className="mt-2 text-slate-300">{invite.email}</div>
                <div className="mt-3 text-xs text-slate-400">
                  Expiră la {formatDate(invite.expiresAt)}
                </div>
              </div>
            )}

            <p className="mt-8 text-sm text-slate-400">
              Ai deja cont?
              {' '}
              <Link href="/login" className="font-medium text-white hover:underline">
                Intră în platformă
              </Link>
            </p>
          </div>

          <div className="px-8 py-10">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                Se verifică invitația...
              </div>
            ) : blocked ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700">
                {error ||
                  (invite?.status === 'expired'
                    ? 'Invitația a expirat.'
                    : invite?.status === 'accepted'
                      ? 'Invitația a fost deja folosită.'
                      : 'Clinica nu poate accepta invitații în acest moment.')}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-slate-700">Prenume</span>
                    <input
                      value={form.firstName}
                      onChange={(event) => setField('firstName', event.target.value)}
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-slate-700">Nume</span>
                    <input
                      value={form.lastName}
                      onChange={(event) => setField('lastName', event.target.value)}
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Email</span>
                    <input
                      type="email"
                      value={invite?.email ?? ''}
                      readOnly
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
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
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {submitting ? 'Se creează contul...' : 'Acceptă invitația'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
