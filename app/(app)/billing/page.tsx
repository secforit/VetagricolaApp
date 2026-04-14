import { cookies } from 'next/headers';
import Link from 'next/link';
import BillingActions from '@/components/BillingActions';
import { getSessionFromCookieStore } from '@/lib/auth';
import prisma from '@/lib/prisma';

function getStatusLabel(status: string) {
  switch (status) {
    case 'trial':
      return 'Trial activ';
    case 'active':
      return 'Abonament activ';
    case 'past_due':
      return 'Plată restantă';
    case 'canceled':
      return 'Abonament anulat';
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

function formatAmount(amountCents: number | null, currency: string) {
  if (amountCents === null) {
    return '—';
  }

  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export default async function BillingPage() {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieStore(cookieStore);

  if (!session) {
    return null;
  }

  const events = await prisma.billingEvent.findMany({
    where: {
      clinic_id: session.clinicId,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 8,
    select: {
      id: true,
      provider: true,
      external_id: true,
      status: true,
      amount_cents: true,
      currency: true,
      created_at: true,
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Facturare clinică</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          În mediul de dezvoltare, reactivarea se face prin Stripe test mode.
          Pagina rămâne punctul central pentru starea clinicii și recuperarea accesului.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Clinică</div>
            <div className="mt-2 text-sm font-medium text-slate-900">{session.clinicName}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Stare</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {getStatusLabel(session.clinicStatus)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acces operațional</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {session.clinicAccessible ? 'Permis' : 'Blocat'}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
            <div className="text-sm font-semibold text-slate-900">Calendar trial / grație</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Sfârșit trial</span>
                <span className="font-medium text-slate-900">{formatDate(session.trialEnd)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Sfârșit grație</span>
                <span className="font-medium text-slate-900">{formatDate(session.graceEnd)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
            <div className="text-sm font-semibold text-slate-900">Următorii pași</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                Clinica poate iniția checkout pentru reactivare direct din această pagină.
                Confirmarea plății este preluată asincron prin webhook.
              </p>
              {!session.clinicAccessible && (
                <p className="font-medium text-amber-700">
                  Clinica este blocată pentru operațiuni până la reactivare sau schimbare pe altă clinică.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <BillingActions session={session} />
          <Link
            href="/settings"
            className="inline-flex w-fit rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Gestionează clinicile
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Evenimente facturare</h2>
        <p className="mt-2 text-sm text-slate-600">
          Fiecare callback de plată este persistat înainte de orice schimbare de status.
        </p>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Suma</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Provider</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">External ID</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nu există evenimente de facturare înregistrate.
                  </td>
                </tr>
              ) : (
                events.map((event, index) => (
                  <tr
                    key={event.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                  >
                    <td className="px-4 py-3 text-slate-600">
                      {event.created_at.toLocaleString('ro-RO')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{event.status}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatAmount(event.amount_cents, event.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{event.provider}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {event.external_id ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
