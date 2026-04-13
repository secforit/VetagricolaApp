import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'record_id', label: 'ID Fișă', type: 'number' },
  { key: 'vet_id', label: 'ID Veterinar', type: 'number' },
  { key: 'pet_id', label: 'ID Animal', type: 'number' },
  { key: 'product_name', label: 'Produs', type: 'text' },
  { key: 'quantity', label: 'Cantitate', type: 'text' },
  { key: 'unit', label: 'Unitate', type: 'text' },
  { key: 'label', label: 'Etichetă', type: 'textarea' },
  { key: 'recommendations', label: 'Recomandări', type: 'textarea' },
  { key: 'prescribed_at', label: 'Data prescrierii', type: 'date' },
  { key: 'expires_at', label: 'Expiră la', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'EXPIRED'] },
  { key: 'internal_notes', label: 'Note interne', type: 'textarea' },
  { key: 'created_at', label: 'Creat la', type: 'text', readOnly: true },
  { key: 'updated_at', label: 'Actualizat la', type: 'text', readOnly: true },
];

export default function PrescriptionsPage() {
  return <SectionPage title="Rețete" apiPath="prescriptions" columns={columns} />;
}
