'use client';

import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';
import { formatSpecies, formatBreed, formatGender } from '@/lib/petLabels';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'client_id', label: 'ID client', type: 'number', linkTo: (v) => `/clients?q=${v}` },
  { key: 'nickname', label: 'Nume', type: 'text' },
  { key: 'species', label: 'Specie', type: 'select', options: ['species.dog', 'species.cat', 'species.bird', 'species.rabbit', 'species.other'], format: formatSpecies },
  { key: 'breed', label: 'Rasă', type: 'text', format: formatBreed },
  { key: 'gender', label: 'Sex', type: 'select', options: ['male', 'female'], format: formatGender },
  // Coloane detaliu
  { key: 'crossbreed', label: 'Metis', type: 'text', tableVisible: false },
  { key: 'mix_with', label: 'Încrucișat cu', type: 'text', tableVisible: false },
  { key: 'color', label: 'Culoare', type: 'text', tableVisible: false },
  { key: 'distinctive_marks', label: 'Semne distinctive', type: 'text', tableVisible: false },
  { key: 'birthday', label: 'Data nașterii', type: 'date', tableVisible: false },
  { key: 'chip_number', label: 'Nr. cip', type: 'text', tableVisible: false },
  { key: 'rabic_tag_number', label: 'Nr. antirabic', type: 'text', tableVisible: false },
  { key: 'microchip_location', label: 'Locație microcip', type: 'text', tableVisible: false },
  { key: 'insurance_number', label: 'Nr. asigurare', type: 'text', tableVisible: false },
  { key: 'passport', label: 'Pașaport', type: 'text', tableVisible: false },
  { key: 'pet_description', label: 'Descriere', type: 'textarea', tableVisible: false },
  { key: 'weight', label: 'Greutate', type: 'text', tableVisible: false },
  { key: 'allergies', label: 'Alergii', type: 'textarea', tableVisible: false },
  { key: 'blood_type', label: 'Grupă sanguină', type: 'text', tableVisible: false },
  { key: 'hormonal_status', label: 'Status hormonal', type: 'text', tableVisible: false },
  { key: 'obs', label: 'Observații', type: 'textarea', tableVisible: false },
];

export default function PetsPage() {
  return <SectionPage title="Animale" apiPath="pets" columns={columns} />;
}
