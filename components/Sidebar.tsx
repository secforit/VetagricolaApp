'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppSession, ClinicMembershipSummary, ClinicRole } from '@/lib/types';
import {
  Home,
  Users,
  PawPrint,
  Calendar,
  FileText,
  Pill,
  ShoppingCart,
  Bell,
  Stethoscope,
  CreditCard,
  Database,
  Settings,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import GlobalSearch from './GlobalSearch';

const NAV: { href: string; label: string; icon: LucideIcon; requiresAccessibleClinic: boolean }[] = [
  { href: '/', label: 'Dashboard', icon: Home, requiresAccessibleClinic: false },
  { href: '/clients', label: 'Clienți', icon: Users, requiresAccessibleClinic: true },
  { href: '/pets', label: 'Animale', icon: PawPrint, requiresAccessibleClinic: true },
  { href: '/appointments', label: 'Programări', icon: Calendar, requiresAccessibleClinic: true },
  { href: '/records', label: 'Fișe medicale', icon: FileText, requiresAccessibleClinic: true },
  { href: '/prescriptions', label: 'Rețete', icon: Pill, requiresAccessibleClinic: true },
  { href: '/sales', label: 'Vânzări', icon: ShoppingCart, requiresAccessibleClinic: true },
  { href: '/reminders', label: 'Remindere', icon: Bell, requiresAccessibleClinic: true },
  { href: '/vets', label: 'Veterinari', icon: Stethoscope, requiresAccessibleClinic: true },
  { href: '/billing', label: 'Facturare', icon: CreditCard, requiresAccessibleClinic: false },
  { href: '/imports', label: 'Import date', icon: Database, requiresAccessibleClinic: false },
  { href: '/settings', label: 'Setări', icon: Settings, requiresAccessibleClinic: false },
];

interface SidebarProps {
  session: AppSession | null;
}

function getRoleLabel(role: ClinicRole | undefined) {
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

function getClinicStatusLabel(status: AppSession['clinicStatus'] | undefined) {
  switch (status) {
    case 'trial':
      return 'Trial';
    case 'active':
      return 'Activă';
    case 'past_due':
      return 'Restantă';
    case 'canceled':
      return 'Anulată';
    default:
      return 'Necunoscut';
  }
}

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const [clinics, setClinics] = useState<ClinicMembershipSummary[]>([]);
  const [switchingClinicId, setSwitchingClinicId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadClinics() {
      if (!session) {
        return;
      }

      try {
        const response = await fetch('/api/account/clinics');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? 'Nu am putut încărca clinicile.');
        }

        if (active) {
          setClinics(payload.data ?? []);
        }
      } catch {
        if (active) {
          setClinics([]);
        }
      }
    }

    loadClinics();

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    setOpenMobileMenu(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleClinicChange(clinicId: string) {
    if (!clinicId || !session || clinicId === session.clinicId) {
      return;
    }

    setSwitchingClinicId(clinicId);

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
      const message =
        error instanceof Error ? error.message : 'Nu am putut schimba clinica activă.';
      alert(message);
      setSwitchingClinicId(null);
    }
  }

  const visibleNav = NAV.filter(
    (entry) => session?.clinicAccessible || !entry.requiresAccessibleClinic
  );

  return (
    <header className="relative z-20 mx-auto w-full max-w-[1500px] px-3 pt-3 md:px-5 md:pt-5">
      <div className="app-surface overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-900 px-4 py-3 text-white md:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-sm font-bold text-white ring-1 ring-white/20">
              CV
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-white">
                {session?.clinicName ?? 'CanisVET'}
              </div>
              <div className="truncate text-xs text-cyan-100/85">
                {session?.fullName ?? session?.email ?? 'Platformă clinică'} · {getRoleLabel(session?.role)}
              </div>
            </div>
            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-cyan-50">
                <span className={`h-1.5 w-1.5 rounded-full ${session?.clinicAccessible ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                {session?.clinicAccessible ? 'Operațional' : 'Acces limitat'}
              </span>
              <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-cyan-50">
                {getClinicStatusLabel(session?.clinicStatus)}
              </span>
            </div>
            <button
              onClick={() => setOpenMobileMenu((current) => !current)}
              className="ml-auto rounded-xl border border-white/25 bg-white/10 p-2 text-white lg:hidden"
              aria-label={openMobileMenu ? 'Închide meniu' : 'Deschide meniu'}
            >
              {openMobileMenu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div className="px-4 py-3 md:px-5">
          <div className="hidden items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 lg:flex">
            <GlobalSearch />
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {session && clinics.length > 1 && (
                <select
                  value={session.clinicId}
                  onChange={(event) => handleClinicChange(event.target.value)}
                  disabled={Boolean(switchingClinicId)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:opacity-60 sm:w-72"
                >
                  {clinics.map((clinic) => (
                    <option key={clinic.clinicId} value={clinic.clinicId}>
                      {clinic.clinicName}
                    </option>
                  ))}
                </select>
              )}
              <div className="text-xs text-slate-500">CanisVET © 2026</div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 lg:hidden"
            >
              <LogOut size={14} aria-hidden="true" />
              <span>Deconectare</span>
            </button>
          </div>

          <div className="mt-3 hidden lg:flex lg:items-center lg:justify-between lg:gap-3">
            <nav className="flex flex-wrap items-center gap-1.5">
              {visibleNav.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={15} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <LogOut size={14} aria-hidden="true" />
              <span>Deconectare</span>
            </button>
          </div>
        </div>

        {openMobileMenu && (
          <nav className="mt-1 grid gap-2 border-t border-slate-200 px-4 pb-4 pt-3 lg:hidden">
            {visibleNav.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
