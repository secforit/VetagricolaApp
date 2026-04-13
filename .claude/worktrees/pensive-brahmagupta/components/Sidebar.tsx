'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  PawPrint,
  CalendarDays,
  ClipboardList,
  Pill,
  DollarSign,
  Bell,
  Stethoscope,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/pets', label: 'Pets', icon: PawPrint },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/records', label: 'Records', icon: ClipboardList },
  { href: '/prescriptions', label: 'Prescriptions', icon: Pill },
  { href: '/sales', label: 'Sales', icon: DollarSign },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/vets', label: 'Vets', icon: Stethoscope },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed top-4 left-4 z-50 md:hidden bg-card border border-border rounded-[var(--radius)] p-2 shadow-sm"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
      </button>

      {/* Overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-sidebar text-sidebar-foreground z-40 flex flex-col
          transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:flex
        `}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
              <PawPrint className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white leading-tight">CanisVet</div>
              <div className="text-xs text-sidebar-foreground/60 mt-0.5">Cabinet Veterinar Arad</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-2">
            Menu
          </div>
          <div className="flex flex-col gap-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-all duration-150
                    ${active
                      ? 'bg-sidebar-accent text-white shadow-sm'
                      : 'text-sidebar-foreground hover:bg-sidebar-muted hover:text-white'
                    }
                  `}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-sm font-medium text-sidebar-foreground hover:bg-sidebar-muted hover:text-white transition-all duration-150"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span>Logout</span>
          </button>
          <div className="text-[10px] text-sidebar-foreground/30 mt-3 px-3">
            VetAgricola &copy; {new Date().getFullYear()}
          </div>
        </div>
      </aside>
    </>
  );
}
