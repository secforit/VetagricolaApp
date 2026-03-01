'use client';

import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'invoice_id', label: 'Factură', type: 'text' },
  { key: 'total', label: 'Total', type: 'text' },
  { key: 'payment_type', label: 'Plată', type: 'select', options: ['cash', 'card', 'online', '0'] },
  { key: 'status', label: 'Status', type: 'select', options: ['0', '1', '2'] },
  { key: 'payment_date', label: 'Dată', type: 'date' },
  // Coloane detaliu
  { key: 'vet_id', label: 'ID veterinar', type: 'number', tableVisible: false, linkTo: (v) => `/vets?q=${v}` },
  { key: 'customer_id', label: 'ID client', type: 'number', tableVisible: false, linkTo: (v) => `/clients?q=${v}` },
  { key: 'subtotal', label: 'Subtotal', type: 'text', tableVisible: false },
  { key: 'tax_amount', label: 'TVA', type: 'text', tableVisible: false },
  { key: 'amount_paid', label: 'Sumă plătită', type: 'text', tableVisible: false },
  { key: 'created_at', label: 'Creat la', type: 'text', readOnly: true, tableVisible: false },
  { key: 'updated_at', label: 'Actualizat la', type: 'text', readOnly: true, tableVisible: false },
];

export default function SalesPage() {
  return <SectionPage title="Vânzări" apiPath="sales" columns={columns} />;
}
