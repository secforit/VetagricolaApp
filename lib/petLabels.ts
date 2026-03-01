export const SPECIES_LABELS: Record<string, string> = {
  'species.dog': 'Câine',
  'species.cat': 'Pisică',
  'species.ferret': 'Dihor',
  'species.bird': 'Pasăre',
  'species.rabbit': 'Iepure',
  'species.other': 'Altul',
};


export function formatSpecies(value: unknown): string {
  const s = String(value ?? '');
  if (!s) return '—';
  if (SPECIES_LABELS[s]) return SPECIES_LABELS[s];
  const last = s.split('.').pop() ?? s;
  return last.replace(/^\w/, c => c.toUpperCase());
}

// Explicit overrides — Romanian breed names that don't map well from camelCase
const BREED_OVERRIDES: Record<string, string> = {
  'breeds.dog.pomeranian_new': 'Pomeranian',
  'breeds.dog.romanianMioriticShepherdDog': 'Ciobanesc Românesc Mioritic',
  'breeds.dog.transylvanianHound': 'Copoi Ardelenesc',
};

function breedSlugToLabel(slug: string): string {
  if (BREED_OVERRIDES[slug]) return BREED_OVERRIDES[slug];
  const last = slug.split('.').pop() ?? slug;
  const words = last
    .replace(/_/g, ' ')
    .replace(/\(([^)]+)\)/g, ' $1')   // belgianShepherd(Malinois) → "belgianShepherd Malinois"
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → spaced
    .replace(/\s+/g, ' ')
    .trim();
  return words.replace(/\b\w/g, c => c.toUpperCase());
}

export const GENDER_LABELS: Record<string, string> = {
  'male': 'Mascul',
  'female': 'Femelă',
};

export function formatGender(value: unknown): string {
  const s = String(value ?? '');
  if (!s) return '—';
  return GENDER_LABELS[s] ?? s;
}

export function formatBreed(value: unknown): string {
  const s = String(value ?? '');
  if (!s) return '—';
  // If the value doesn't look like a slug, return as-is
  if (!s.includes('.')) return s;
  return breedSlugToLabel(s);
}
