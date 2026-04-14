import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'first_name', label: 'Prenume', type: 'text' },
  { key: 'last_name', label: 'Nume', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Telefon', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['0', '1'] },
  // Coloane detaliu
  { key: 'title', label: 'Titlu', type: 'text', tableVisible: false },
  { key: 'license_number', label: 'Nr. licență', type: 'text', tableVisible: false },
  { key: 'created_at', label: 'Creat la', type: 'text', readOnly: true, tableVisible: false },
  { key: 'updated_at', label: 'Actualizat la', type: 'text', readOnly: true, tableVisible: false },
];

export default function VetsPage() {
  return <SectionPage title="Veterinari" apiPath="vets" columns={columns} />;
}
