import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'first_name', label: 'Prenume', type: 'text' },
  { key: 'last_name', label: 'Nume', type: 'text' },
  { key: 'birthdate', label: 'Data nașterii', type: 'date' },
  { key: 'address', label: 'Adresă', type: 'text' },
  { key: 'city', label: 'Oraș', type: 'text' },
  { key: 'phone', label: 'Telefon', type: 'text' },
  { key: 'secondary_phone', label: 'Telefon secundar', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'personal_id_number', label: 'CNP', type: 'text' },
  { key: 'id_card_number', label: 'Nr. Carte Identitate', type: 'text' },
  { key: 'obs', label: 'Observații', type: 'textarea' },
];

export default function ClientsPage() {
  return <SectionPage title="Clienți" apiPath="clients" columns={columns} />;
}
