'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  PawPrint,
  Calendar,
  FileText,
  Pill,
  ShoppingCart,
  Bell,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';

const SECTIONS: { key: string; label: string; Icon: LucideIcon; href: string; color: string; iconColor: string }[] = [
  { key: 'clients', label: 'Clienți', Icon: Users, href: '/clients', color: 'from-sky-50 to-cyan-50 border-sky-200/60 hover:border-sky-300', iconColor: 'text-sky-700' },
  { key: 'pets', label: 'Animale', Icon: PawPrint, href: '/pets', color: 'from-emerald-50 to-teal-50 border-emerald-200/60 hover:border-emerald-300', iconColor: 'text-emerald-700' },
  { key: 'appointments', label: 'Programări', Icon: Calendar, href: '/appointments', color: 'from-indigo-50 to-blue-50 border-indigo-200/60 hover:border-indigo-300', iconColor: 'text-indigo-700' },
  { key: 'records', label: 'Fișe medicale', Icon: FileText, href: '/records', color: 'from-amber-50 to-yellow-50 border-amber-200/70 hover:border-amber-300', iconColor: 'text-amber-700' },
  { key: 'prescriptions', label: 'Rețete', Icon: Pill, href: '/prescriptions', color: 'from-rose-50 to-orange-50 border-rose-200/70 hover:border-rose-300', iconColor: 'text-rose-700' },
  { key: 'sales', label: 'Vânzări', Icon: ShoppingCart, href: '/sales', color: 'from-teal-50 to-cyan-50 border-teal-200/70 hover:border-teal-300', iconColor: 'text-teal-700' },
  { key: 'reminders', label: 'Remindere', Icon: Bell, href: '/reminders', color: 'from-orange-50 to-amber-50 border-orange-200/70 hover:border-orange-300', iconColor: 'text-orange-700' },
  { key: 'vets', label: 'Veterinari', Icon: Stethoscope, href: '/vets', color: 'from-cyan-50 to-sky-50 border-cyan-200/70 hover:border-cyan-300', iconColor: 'text-cyan-700' },
];

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setCounts);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">CanisVET</div>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Dashboard operațional</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Vizualizare rapidă pentru modulele principale ale clinicii. Datele sunt actualizate în contextul clinicii active.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SECTIONS.map(({ key, label, Icon, href, color, iconColor }) => (
          <Link
            key={key}
            href={href}
            className={`rounded-2xl border bg-gradient-to-br p-5 transition hover:-translate-y-0.5 hover:shadow-md ${color}`}
          >
            <div className={`w-fit rounded-xl bg-white p-2.5 ${iconColor}`}>
              <Icon size={22} aria-hidden="true" />
            </div>
            <div>
              {counts === null ? (
                <div className="mb-1 h-7 w-12 animate-pulse rounded bg-slate-200" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">{counts[key] ?? '—'}</div>
              )}
              <div className="text-sm font-semibold text-slate-700">{label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
