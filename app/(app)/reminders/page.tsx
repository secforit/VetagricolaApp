'use client';

import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'pet_id', label: 'ID animal', type: 'number', linkTo: (v) => `/pets?q=${v}` },
  { key: 'protocol_name', label: 'Protocol', type: 'text' },
  { key: 'name', label: 'Denumire', type: 'text' },
  { key: 'administration_date', label: 'Data administrării', type: 'date' },
  { key: 'due_date', label: 'Scadență', type: 'date' },
];

export default function RemindersPage() {
  return <SectionPage title="Mementouri" apiPath="reminders" columns={columns} />;
}
