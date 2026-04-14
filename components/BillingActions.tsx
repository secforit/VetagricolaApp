'use client';

import { useState } from 'react';
import { AppSession } from '@/lib/types';

interface BillingActionsProps {
  session: AppSession;
}

export default function BillingActions({ session }: BillingActionsProps) {
  const [loadingAction, setLoadingAction] = useState<'checkout' | 'portal' | null>(null);
  const [error, setError] = useState('');

  async function handleCheckout() {
    setError('');
    setLoadingAction('checkout');

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut initializa plata.');
      }

      if (!payload.checkoutUrl) {
        throw new Error('Checkout URL lipseste din raspuns.');
      }

      window.location.href = payload.checkoutUrl as string;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Nu am putut initializa plata.'
      );
      setLoadingAction(null);
    }
  }

  async function handlePortal() {
    setError('');
    setLoadingAction('portal');

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut deschide portalul de facturare.');
      }

      if (!payload.portalUrl) {
        throw new Error('Portal URL lipseste din raspuns.');
      }

      window.location.href = payload.portalUrl as string;
    } catch (portalError) {
      setError(
        portalError instanceof Error
          ? portalError.message
          : 'Nu am putut deschide portalul de facturare.'
      );
      setLoadingAction(null);
    }
  }

  if (session.role !== 'clinic_admin') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Plata poate fi initiata doar de administratorii clinicii.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loadingAction !== null}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loadingAction === 'checkout' ? 'Se initiaza checkout...' : 'Reactivare prin Stripe (test)'}
        </button>
        <button
          type="button"
          onClick={handlePortal}
          disabled={loadingAction !== null}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
        >
          {loadingAction === 'portal' ? 'Se deschide portalul...' : 'Gestioneaza abonamentul'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
