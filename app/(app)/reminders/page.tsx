import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'pet_id', label: 'ID Animal', type: 'number' },
  { key: 'protocol_name', label: 'Protocol', type: 'text' },
  { key: 'name', label: 'Nume', type: 'text' },
  { key: 'administration_date', label: 'Data administrării', type: 'date' },
  { key: 'due_date', label: 'Scadent la', type: 'date' },
];

export default function RemindersPage() {
  return <SectionPage title="Remindere" apiPath="reminders" columns={columns} />;
}
