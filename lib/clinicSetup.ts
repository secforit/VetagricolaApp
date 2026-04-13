export const TRIAL_DAYS = 30;
export const GRACE_DAYS = 2;

export interface ClinicSetupPayload {
  clinicName: string;
  legalName: string;
  cuiCif: string;
  tradeRegisterNumber: string;
  isVatPayer: boolean;
  billingAddress: string;
  county: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptDpa: boolean;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateClinicSetupPayload(
  body: Record<string, unknown>
): { ok: true; data: ClinicSetupPayload } | { ok: false; error: string } {
  const clinicName = readText(body.clinicName);
  const legalName = readText(body.legalName);
  const cuiCif = readText(body.cuiCif).toUpperCase();
  const tradeRegisterNumber = readText(body.tradeRegisterNumber).toUpperCase();
  const billingAddress = readText(body.billingAddress);
  const county = readText(body.county);
  const city = readText(body.city);
  const contactEmail = normalizeEmail(readText(body.contactEmail));
  const contactPhone = readText(body.contactPhone);

  const isVatPayer = Boolean(body.isVatPayer);
  const acceptTerms = Boolean(body.acceptTerms);
  const acceptPrivacy = Boolean(body.acceptPrivacy);
  const acceptDpa = Boolean(body.acceptDpa);

  if (
    !clinicName ||
    !legalName ||
    !cuiCif ||
    !tradeRegisterNumber ||
    !billingAddress ||
    !county ||
    !city ||
    !contactEmail ||
    !contactPhone
  ) {
    return { ok: false, error: 'Completează toate câmpurile obligatorii.' };
  }

  if (!acceptTerms || !acceptPrivacy || !acceptDpa) {
    return { ok: false, error: 'Trebuie să accepți documentele legale pentru a continua.' };
  }

  return {
    ok: true,
    data: {
      clinicName,
      legalName,
      cuiCif,
      tradeRegisterNumber,
      isVatPayer,
      billingAddress,
      county,
      city,
      contactEmail,
      contactPhone,
      acceptTerms,
      acceptPrivacy,
      acceptDpa,
    },
  };
}

export function buildTrialWindow(now = new Date()) {
  const trialStart = new Date(now);
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  const graceEnd = new Date(trialEnd);
  graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);

  return {
    trialStart,
    trialEnd,
    graceEnd,
  };
}
