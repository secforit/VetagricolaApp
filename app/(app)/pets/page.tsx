import SectionPage from '@/components/SectionPage';
import { Column } from '@/lib/types';

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'text', readOnly: true },
  { key: 'client_id', label: 'ID Client', type: 'number' },
  { key: 'nickname', label: 'Nume', type: 'text' },
  { key: 'species', label: 'Specie', type: 'select', options: ['Câine', 'Pisică', 'Pasăre', 'Iepure', 'Altele'] },
  { key: 'breed', label: 'Rasă', type: 'text' },
  { key: 'crossbreed', label: 'Metis', type: 'text' },
  { key: 'mix_with', label: 'Încrucișat cu', type: 'text' },
  { key: 'color', label: 'Culoare', type: 'text' },
  { key: 'distinctive_marks', label: 'Semne distinctive', type: 'text' },
  { key: 'birthday', label: 'Data nașterii', type: 'date' },
  { key: 'gender', label: 'Gen', type: 'select', options: ['Mascul', 'Femelă'] },
  { key: 'chip_number', label: 'Nr. Microcip', type: 'text' },
  { key: 'rabic_tag_number', label: 'Nr. Crotalie rabică', type: 'text' },
  { key: 'microchip_location', label: 'Localizare microcip', type: 'text' },
  { key: 'insurance_number', label: 'Nr. Asigurare', type: 'text' },
  { key: 'passport', label: 'Pașaport', type: 'text' },
  { key: 'pet_description', label: 'Descriere', type: 'textarea' },
  { key: 'weight', label: 'Greutate (kg)', type: 'text' },
  { key: 'allergies', label: 'Alergii', type: 'textarea' },
  { key: 'blood_type', label: 'Grupa sanguină', type: 'text' },
  { key: 'hormonal_status', label: 'Status hormonal', type: 'text' },
  { key: 'obs', label: 'Observații', type: 'textarea' },
];

export default function PetsPage() {
  return <SectionPage title="Animale" apiPath="pets" columns={columns} />;
}
