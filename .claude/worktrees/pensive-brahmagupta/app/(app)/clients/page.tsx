'use client';

import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'first_name', label: 'Prenume', type: 'text' },
  { key: 'last_name', label: 'Nume', type: 'text' },
  { key: 'phone', label: 'Telefon', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'city', label: 'Oraș', type: 'text' },
  { key: 'pet_count', label: 'Animale', type: 'number', readOnly: true, virtual: true, linkTo: (_v, row) => `/pets?q=${row.id}` },
  // Coloane detaliu (vizibile în panoul expandat și modal)
  { key: 'birthdate', label: 'Data nașterii', type: 'date', tableVisible: false },
  { key: 'address', label: 'Adresă', type: 'text', tableVisible: false },
  { key: 'secondary_phone', label: 'Tel. secundar', type: 'text', tableVisible: false },
  { key: 'personal_id_number', label: 'CNP', type: 'text', tableVisible: false },
  { key: 'id_card_number', label: 'Nr. buletin', type: 'text', tableVisible: false },
  { key: 'obs', label: 'Observații', type: 'textarea', tableVisible: false },
];

export default function ClientsPage() {
  return <SectionPage title="Clienți" apiPath="clients" columns={columns} />;
}
