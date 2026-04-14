'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
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
  { href: '/', label: 'Panou', icon: LayoutDashboard },
  { href: '/clients', label: 'Clienți', icon: Users },
  { href: '/pets', label: 'Animale', icon: PawPrint },
  { href: '/appointments', label: 'Programări', icon: CalendarDays },
  { href: '/records', label: 'Fișe medicale', icon: ClipboardList },
  { href: '/prescriptions', label: 'Rețete', icon: Pill },
  { href: '/sales', label: 'Vânzări', icon: DollarSign },
  { href: '/reminders', label: 'Mementouri', icon: Bell },
  { href: '/vets', label: 'Veterinari', icon: Stethoscope },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [mobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-sidebar text-sidebar-foreground shadow-md">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between px-4 h-14">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Logo" width={40} height={40} className="object-contain" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] text-xs font-medium transition-all duration-150
                  ${active
                    ? 'bg-sidebar-accent text-white shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-muted hover:text-white'
                  }
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop logout */}
        <button
          onClick={handleLogout}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium text-sidebar-foreground hover:bg-sidebar-muted hover:text-white transition-all duration-150 shrink-0"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Deconectare</span>
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="lg:hidden p-2 rounded-[var(--radius)] hover:bg-sidebar-muted transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-14 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div
            ref={menuRef}
            className="absolute top-14 left-0 right-0 bg-sidebar border-t border-sidebar-border shadow-lg z-50 lg:hidden"
          >
            <nav className="flex flex-col p-3 gap-0.5 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-all duration-150
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
              <div className="border-t border-sidebar-border my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-medium text-sidebar-foreground hover:bg-sidebar-muted hover:text-white transition-all duration-150 w-full text-left"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
                <span>Deconectare</span>
              </button>
              <div className="text-[10px] text-sidebar-foreground/30 mt-2 px-3">
                VetAgricola &copy; {new Date().getFullYear()}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
