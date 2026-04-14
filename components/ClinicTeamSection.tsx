'use client';

import { useEffect, useState } from 'react';
import { AppSession, ClinicRole, ClinicTeamSnapshot } from '@/lib/types';

interface ClinicTeamSectionProps {
  session: AppSession;
}

function getRoleLabel(role: ClinicRole) {
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

export default function ClinicTeamSection({ session }: ClinicTeamSectionProps) {
  const [snapshot, setSnapshot] = useState<ClinicTeamSnapshot | null>(null);
  const [loading, setLoading] = useState(session.role === 'clinic_admin');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'assistant' as ClinicRole,
  });

  useEffect(() => {
    let active = true;

    async function loadTeam() {
      if (session.role !== 'clinic_admin' || !session.clinicAccessible) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/account/team');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? 'Nu am putut încărca echipa clinicii.');
        }

        if (active) {
          setSnapshot(payload);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Nu am putut încărca echipa clinicii.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTeam();

    return () => {
      active = false;
    };
  }, [session.role, session.clinicAccessible]);

  async function refreshTeam() {
    const response = await fetch('/api/account/team');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error ?? 'Nu am putut încărca echipa clinicii.');
    }
    setSnapshot(payload);
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setBusyKey('invite');

    try {
      const response = await fetch('/api/account/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut trimite invitația.');
      }

      setSnapshot(payload.snapshot ?? null);
      setInviteForm({
        email: '',
        role: 'assistant',
      });
      setSuccess('Invitația a fost trimisă.');
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Nu am putut trimite invitația.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setError('');
    setSuccess('');
    setBusyKey(`invite:${inviteId}`);

    try {
      const response = await fetch(`/api/account/team/invites/${inviteId}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut anula invitația.');
      }

      await refreshTeam();
      setSuccess('Invitația a fost anulată.');
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Nu am putut anula invitația.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRoleChange(userId: string, role: ClinicRole) {
    setError('');
    setSuccess('');
    setBusyKey(`member:${userId}`);

    try {
      const response = await fetch(`/api/account/team/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut actualiza rolul.');
      }

      await refreshTeam();
      setSuccess('Rolul utilizatorului a fost actualizat.');
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Nu am putut actualiza rolul.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Elimini acest utilizator din clinică?')) {
      return;
    }

    setError('');
    setSuccess('');
    setBusyKey(`member:${userId}`);

    try {
      const response = await fetch(`/api/account/team/members/${userId}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut elimina utilizatorul.');
      }

      await refreshTeam();
      setSuccess('Utilizatorul a fost eliminat din clinică.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Nu am putut elimina utilizatorul.');
    } finally {
      setBusyKey(null);
    }
  }

  if (session.role !== 'clinic_admin') {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Echipă clinică</h2>
        <p className="mt-2 text-sm text-slate-600">
          Administrarea utilizatorilor și invitațiilor este disponibilă doar pentru administratorii clinicii.
        </p>
      </section>
    );
  }

  if (!session.clinicAccessible) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Echipă clinică</h2>
        <p className="mt-2 text-sm text-slate-600">
          Gestionarea utilizatorilor este blocată cât timp clinica este în afara perioadei de trial sau grație.
          Poți totuși schimba pe altă clinică din setări sau merge la facturare pentru reactivare.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Echipă clinică</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Invită utilizatori noi, actualizează rolurile și gestionează accesul în clinică.
          </p>
        </div>
        {snapshot && (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Utilizatori activi: {snapshot.activeUserCount}
            {snapshot.isTrial ? ` / ${snapshot.trialUserLimit}` : ''}
            <br />
            Invitații în așteptare: {snapshot.pendingInviteCount}
          </div>
        )}
      </div>

      {(error || success) && (
        <div
          className={`mt-5 rounded-2xl border px-5 py-4 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {error || success}
        </div>
      )}

      <form onSubmit={handleInvite} className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-4 md:grid-cols-[1.4fr,0.8fr,auto] md:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Email utilizator</span>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Rol</span>
            <select
              value={inviteForm.role}
              onChange={(event) =>
                setInviteForm((current) => ({
                  ...current,
                  role: event.target.value as ClinicRole,
                }))
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="assistant">Asistent</option>
              <option value="vet">Veterinar</option>
              <option value="clinic_admin">Administrator clinică</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busyKey === 'invite'}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busyKey === 'invite' ? 'Se trimite...' : 'Trimite invitația'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Utilizatorul va primi un email cu linkul de activare a contului. În trial se aplică limita de 2 utilizatori.
        </p>
      </form>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr,0.9fr]">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Utilizatori activi
          </h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Utilizator</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Rol</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Adăugat</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Se încarcă echipa...
                    </td>
                  </tr>
                ) : snapshot && snapshot.members.length > 0 ? (
                  snapshot.members.map((member, index) => (
                    <tr key={member.userId} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900">
                          {member.fullName ?? member.email}
                          {member.userId === session.userId ? ' (tu)' : ''}
                        </div>
                        <div className="text-xs text-slate-500">{member.email}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {member.isOwner ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            Proprietar
                          </span>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(event) =>
                              handleRoleChange(member.userId, event.target.value as ClinicRole)
                            }
                            disabled={busyKey === `member:${member.userId}` || member.userId === session.userId}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:opacity-60"
                          >
                            <option value="assistant">Asistent</option>
                            <option value="vet">Veterinar</option>
                            <option value="clinic_admin">Administrator clinică</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {member.isOwner || member.userId === session.userId ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={busyKey === `member:${member.userId}`}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                          >
                            Elimină
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Nu există utilizatori în clinică.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Invitații în așteptare
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-400">
                Se încarcă invitațiile...
              </div>
            ) : snapshot && snapshot.invites.length > 0 ? (
              snapshot.invites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="font-medium text-slate-900">{invite.email}</div>
                  <div className="mt-1 text-sm text-slate-600">{getRoleLabel(invite.role)}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Expiră la {formatDate(invite.expiresAt)} · {invite.status === 'expired' ? 'expirată' : 'în așteptare'}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCancelInvite(invite.id)}
                      disabled={busyKey === `invite:${invite.id}`}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                    >
                      Anulează
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-400">
                Nu există invitații active.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
