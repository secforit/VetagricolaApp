'use client';

import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';
import { formatService } from '@/lib/serviceLabels';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'date', label: 'Dată', type: 'date' },
  { key: 'pet', label: 'Nume animal', type: 'text' },
  { key: 'vet', label: 'Veterinar', type: 'text' },
  { key: 'service', label: 'Serviciu', type: 'text', format: formatService },
  { key: 'diagnosis', label: 'Diagnostic', type: 'text' },
  // Coloane detaliu
  { key: 'pet_id', label: 'ID animal', type: 'number', tableVisible: false, linkTo: (v) => `/pets?q=${v}` },
  { key: 'diagnosis_description', label: 'Descriere diagnostic', type: 'textarea', tableVisible: false },
  { key: 'presumptive_diagnosis', label: 'Diag. prezumtiv', type: 'text', tableVisible: false },
  { key: 'treatment_description', label: 'Tratament', type: 'textarea', tableVisible: false },
  { key: 'recommendations', label: 'Recomandări', type: 'textarea', tableVisible: false },
  { key: 'comments', label: 'Comentarii', type: 'textarea', tableVisible: false },
];

export default function RecordsPage() {
  return <SectionPage title="Fișe medicale" apiPath="records" columns={columns} />;
}
