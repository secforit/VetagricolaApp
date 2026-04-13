import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'date', label: 'Data', type: 'date' },
  { key: 'pet_id', label: 'ID Animal', type: 'number' },
  { key: 'pet', label: 'Nume Animal', type: 'text', readOnly: true },
  { key: 'vet', label: 'Veterinar', type: 'text', readOnly: true },
  { key: 'service', label: 'Serviciu', type: 'text' },
  { key: 'diagnosis', label: 'Diagnostic', type: 'text' },
  { key: 'diagnosis_description', label: 'Descriere diagnostic', type: 'textarea' },
  { key: 'presumptive_diagnosis', label: 'Diagnostic prezumtiv', type: 'text' },
  { key: 'treatment_description', label: 'Tratament', type: 'textarea' },
  { key: 'recommendations', label: 'Recomandări', type: 'textarea' },
  { key: 'comments', label: 'Comentarii', type: 'textarea' },
];

export default function RecordsPage() {
  return <SectionPage title="Fișe medicale" apiPath="records" columns={columns} />;
}
