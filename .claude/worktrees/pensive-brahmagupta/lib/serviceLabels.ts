export const SERVICE_LABELS: Record<string, string> = {
  'services.basic.deworming': 'Deparazitare',
  'services.basic.flea_treatment': 'Tratament antiparazitar',
  'services.basic.recheck': 'Recontrol',
  'services.basic.vaccinations': 'Vaccinare',
  'services.checkups.general_checkup': 'Consultație generală',
};

export function formatService(value: unknown): string {
  const s = String(value ?? '');
  if (!s) return '—';
  if (SERVICE_LABELS[s]) return SERVICE_LABELS[s];
  const last = s.split('.').pop() ?? s;
  return last.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}
