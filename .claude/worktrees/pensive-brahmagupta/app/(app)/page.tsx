'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  PawPrint,
  CalendarDays,
  ClipboardList,
  Pill,
  DollarSign,
  Bell,
  Stethoscope,
  ArrowUpRight,
  TrendingUp,
  Activity,
} from 'lucide-react';

interface DashboardCounts {
  clients: number;
  pets: number;
  appointments: number;
  records: number;
  prescriptions: number;
  sales: number;
  reminders: number;
  vets: number;
  [key: string]: number;
}

const SECTIONS = [
  { key: 'clients', label: 'Clienți', icon: Users, href: '/clients', description: 'Proprietari înregistrați' },
  { key: 'pets', label: 'Animale', icon: PawPrint, href: '/pets', description: 'Animale în îngrijire' },
  { key: 'appointments', label: 'Programări', icon: CalendarDays, href: '/appointments', description: 'Vizite programate' },
  { key: 'records', label: 'Fișe medicale', icon: ClipboardList, href: '/records', description: 'Dosare medicale' },
  { key: 'prescriptions', label: 'Rețete', icon: Pill, href: '/prescriptions', description: 'Rețete active' },
  { key: 'sales', label: 'Vânzări', icon: DollarSign, href: '/sales', description: 'Tranzacții' },
  { key: 'reminders', label: 'Mementouri', icon: Bell, href: '/reminders', description: 'Mementouri în așteptare' },
  { key: 'vets', label: 'Veterinari', icon: Stethoscope, href: '/vets', description: 'Medici veterinari' },
] as const;

function StatCard({
  label,
  count,
  icon: Icon,
  href,
  description,
  highlight,
}: {
  label: string;
  count: number | null;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        group relative flex flex-col justify-between rounded-[var(--radius)] border p-5
        transition-all duration-200 hover:shadow-md
        ${highlight
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-card-foreground border-border hover:border-primary/30'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div
          className={`
            flex h-10 w-10 items-center justify-center rounded-[var(--radius)]
            ${highlight ? 'bg-white/20' : 'bg-primary-light'}
          `}
        >
          <Icon className={`h-5 w-5 ${highlight ? 'text-white' : 'text-primary'}`} />
        </div>
        <ArrowUpRight
          className={`
            h-4 w-4 opacity-0 transition-all duration-200 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0
            ${highlight ? 'text-white/70' : 'text-muted-foreground'}
          `}
        />
      </div>
      <div className="mt-4">
        <div className={`text-2xl font-bold tracking-tight ${highlight ? 'text-white' : 'text-foreground'}`}>
          {count !== null ? count.toLocaleString() : (
            <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted" />
          )}
        </div>
        <div className={`text-sm font-medium mt-0.5 ${highlight ? 'text-white/90' : 'text-foreground'}`}>
          {label}
        </div>
        <div className={`text-xs mt-0.5 ${highlight ? 'text-white/60' : 'text-muted-foreground'}`}>
          {description}
        </div>
      </div>
    </Link>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Client nou', href: '/clients', icon: Users },
    { label: 'Programare nouă', href: '/appointments', icon: CalendarDays },
    { label: 'Fișă nouă', href: '/records', icon: ClipboardList },
    { label: 'Rețetă nouă', href: '/prescriptions', icon: Pill },
  ];

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Acțiuni rapide</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-all duration-150 hover:border-primary/30 hover:bg-primary-light/50"
          >
            <Icon className="h-4 w-4 text-primary" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function OverviewChart({ counts }: { counts: DashboardCounts | null }) {
  if (!counts) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6">
        <div className="h-64 flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Se încarcă graficul...</span>
        </div>
      </div>
    );
  }

  const data = [
    { label: 'Clienți', value: counts.clients, color: 'var(--color-primary)' },
    { label: 'Animale', value: counts.pets, color: '#10b981' },
    { label: 'Prog.', value: counts.appointments, color: '#f59e0b' },
    { label: 'Fișe', value: counts.records, color: '#6366f1' },
    { label: 'Rețete', value: counts.prescriptions, color: '#ef4444' },
    { label: 'Vânzări', value: counts.sales, color: '#06b6d4' },
  ];

  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Prezentare generală</h2>
      </div>
      <div className="flex items-end gap-3 h-48">
        {data.map(({ label, value, color }) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{value}</span>
            <div
              className="w-full rounded-t-md transition-all duration-500 min-h-1"
              style={{
                height: `${Math.max((value / maxVal) * 100, 4)}%`,
                backgroundColor: color,
                opacity: 0.85,
              }}
            />
            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setCounts);
  }, []);

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Bună dimineața' : today.getHours() < 18 ? 'Bună ziua' : 'Bună seara';

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance">
          {greeting}, Doctor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Iată o prezentare generală a clinicii veterinare astăzi,{' '}
          {today.toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {SECTIONS.map(({ key, label, icon, href, description }, i) => (
          <StatCard
            key={key}
            label={label}
            count={counts ? (counts as Record<string, number>)[key] ?? 0 : null}
            icon={icon}
            href={href}
            description={description}
            highlight={i === 0}
          />
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OverviewChart counts={counts} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
