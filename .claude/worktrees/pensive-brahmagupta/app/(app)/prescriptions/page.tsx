'use client';

import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'pet_id', label: 'ID animal', type: 'number', linkTo: (v) => `/pets?q=${v}` },
  { key: 'product_name', label: 'Produs', type: 'text' },
  { key: 'quantity', label: 'Cantitate', type: 'text' },
  { key: 'prescribed_at', label: 'Prescris la', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'EXPIRED'] },
  // Coloane detaliu
  { key: 'record_id', label: 'ID fișă', type: 'number', tableVisible: false, linkTo: (v) => `/records?q=${v}` },
  { key: 'vet_id', label: 'ID veterinar', type: 'number', tableVisible: false, linkTo: (v) => `/vets?q=${v}` },
  { key: 'unit', label: 'Unitate', type: 'text', tableVisible: false },
  { key: 'label', label: 'Etichetă', type: 'textarea', tableVisible: false },
  { key: 'recommendations', label: 'Recomandări', type: 'textarea', tableVisible: false },
  { key: 'expires_at', label: 'Expiră la', type: 'date', tableVisible: false },
  { key: 'internal_notes', label: 'Note interne', type: 'textarea', tableVisible: false },
  { key: 'created_at', label: 'Creat la', type: 'text', readOnly: true, tableVisible: false },
  { key: 'updated_at', label: 'Actualizat la', type: 'text', readOnly: true, tableVisible: false },
];

export default function PrescriptionsPage() {
  return <SectionPage title="Rețete" apiPath="prescriptions" columns={columns} />;
}
