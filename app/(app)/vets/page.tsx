import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'first_name', label: 'Prenume', type: 'text' },
  { key: 'last_name', label: 'Nume', type: 'text' },
  { key: 'title', label: 'Titlu', type: 'text' },
  { key: 'phone', label: 'Telefon', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['activ', 'inactiv'] },
  { key: 'license_number', label: 'Nr. Licență', type: 'text' },
  { key: 'created_at', label: 'Creat la', type: 'text', readOnly: true },
  { key: 'updated_at', label: 'Actualizat la', type: 'text', readOnly: true },
];

export default function VetsPage() {
  return <SectionPage title="Veterinari" apiPath="vets" columns={columns} />;
}
