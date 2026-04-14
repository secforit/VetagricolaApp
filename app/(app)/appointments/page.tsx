import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'patient_id', label: 'ID Animal', type: 'number' },
  { key: 'vet_id', label: 'ID Veterinar', type: 'number' },
  { key: 'service', label: 'Serviciu', type: 'text' },
  { key: 'observations', label: 'Observații', type: 'textarea' },
  { key: 'date', label: 'Data', type: 'date' },
  { key: 'duration', label: 'Durată (min)', type: 'number' },
  { key: 'reason', label: 'Motiv', type: 'text' },
  { key: 'notification_message', label: 'Mesaj notificare', type: 'textarea' },
  { key: 'user_note', label: 'Notă utilizator', type: 'textarea' },
];

export default function AppointmentsPage() {
  return <SectionPage title="Programări" apiPath="appointments" columns={columns} />;
}
