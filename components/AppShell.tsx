'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { AppSession } from '@/lib/types';

interface AppShellProps {
  session: AppSession | null;
  children: React.ReactNode;
}

const ACCESSIBLE_WHEN_BLOCKED = ['/billing', '/settings'];

function getStatusLabel(status: AppSession['clinicStatus'] | undefined) {
  switch (status) {
    case 'trial':
      return 'Trial';
    case 'active':
      return 'Activă';
    case 'past_due':
      return 'Plată restantă';
    case 'canceled':
      return 'Anulată';
    default:
      return 'Necunoscut';
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

export default function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname();
  const clinicBlocked = Boolean(session && !session.clinicAccessible);
  const allowCurrentPath = ACCESSIBLE_WHEN_BLOCKED.some(
    (allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`)
  );

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-28 top-12 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-sky-200/35 blur-3xl" />
      </div>
      <Sidebar session={session} />
      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-3 pb-6 md:px-5">
        <div className="app-surface min-h-[calc(100vh-7.5rem)] rounded-3xl p-5 md:p-7">
        {clinicBlocked && session && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-900">
            <div className="font-semibold">
              Acces clinică restricționat: {getStatusLabel(session.clinicStatus)}
            </div>
            <div className="mt-2">
              Clinica curentă nu mai poate accesa datele operaționale.
              Verifică facturarea sau schimbă pe o altă clinică.
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-amber-800">
              <span>Trial: {formatDate(session.trialEnd)}</span>
              <span>Grație: {formatDate(session.graceEnd)}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/billing"
                className="rounded-xl bg-amber-900 px-4 py-2 font-medium text-white hover:bg-amber-800"
              >
                Vezi facturarea
              </Link>
              <Link
                href="/settings"
                className="rounded-xl border border-amber-300 px-4 py-2 font-medium text-amber-900 hover:bg-amber-100"
              >
                Schimbă clinica
              </Link>
            </div>
          </div>
        )}

        {clinicBlocked && !allowCurrentPath ? (
          <div className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center">
            <div className="w-full rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                ⛔
              </div>
              <h1 className="mt-6 text-2xl font-bold text-slate-900">
                Accesul clinicii este restricționat
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Datele medicale și operaționale sunt blocate până la reactivare sau până când
                schimbi pe o altă clinică accesibilă.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/billing"
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Deschide facturarea
                </Link>
                <Link
                  href="/settings"
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Mergi la setări clinică
                </Link>
              </div>
            </div>
          </div>
        ) : (
          children
        )}
        </div>
      </main>
    </div>
  );
}
