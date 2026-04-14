import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'invoice_id', label: 'Nr. Factură', type: 'text' },
  { key: 'vet_id', label: 'ID Veterinar', type: 'number' },
  { key: 'customer_id', label: 'ID Client', type: 'number' },
  { key: 'subtotal', label: 'Subtotal (RON)', type: 'number' },
  { key: 'tax_amount', label: 'TVA (RON)', type: 'number' },
  { key: 'total', label: 'Total (RON)', type: 'number' },
  { key: 'amount_paid', label: 'Sumă Plătită (RON)', type: 'number' },
  { key: 'payment_type', label: 'Metodă Plată', type: 'select', options: ['numerar', 'card', 'transfer online'] },
  { key: 'status', label: 'Status', type: 'select', options: ['neplatit', 'platit', 'anulat'] },
  { key: 'payment_date', label: 'Data Plății', type: 'date' },
  { key: 'created_at', label: 'Creat la', type: 'text', readOnly: true },
  { key: 'updated_at', label: 'Actualizat la', type: 'text', readOnly: true },
];

export default function SalesPage() {
  return <SectionPage title="Vânzări" apiPath="sales" columns={columns} />;
}
