'use client';

import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';
import { formatService } from '@/lib/serviceLabels';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'patient_id', label: 'ID animal', type: 'number', linkTo: (v) => `/pets?q=${v}` },
  { key: 'vet_id', label: 'ID veterinar', type: 'number', linkTo: (v) => `/vets?q=${v}` },
  { key: 'service', label: 'Serviciu', type: 'text', format: formatService },
  { key: 'date', label: 'Dată', type: 'text' },
  { key: 'reason', label: 'Motiv', type: 'text' },
  // Coloane detaliu
  { key: 'observations', label: 'Observații', type: 'textarea', tableVisible: false },
  { key: 'duration', label: 'Durată (min)', type: 'number', tableVisible: false },
  { key: 'notification_message', label: 'Notificare', type: 'textarea', tableVisible: false },
  { key: 'user_note', label: 'Notă utilizator', type: 'textarea', tableVisible: false },
];

export default function AppointmentsPage() {
  return <SectionPage title="Programări" apiPath="appointments" columns={columns} />;
}
