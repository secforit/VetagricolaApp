import Papa from 'papaparse';
import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { getTableDelegate, prepareMutationData, SupportedTable } from './prismaTables';

const SUPPORTED_TABLES: SupportedTable[] = [
  'clients',
  'pets',
  'vets',
  'appointments',
  'records',
  'prescriptions',
  'reminders',
  'sales',
];

const TARGET_FIELDS: Record<SupportedTable, string[]> = {
  clients: [
    'first_name',
    'last_name',
    'birthdate',
    'address',
    'city',
    'phone',
    'secondary_phone',
    'email',
    'personal_id_number',
    'id_card_number',
    'obs',
  ],
  pets: [
    'client_id',
    'nickname',
    'species',
    'breed',
    'crossbreed',
    'mix_with',
    'color',
    'distinctive_marks',
    'birthday',
    'gender',
    'chip_number',
    'rabic_tag_number',
    'microchip_location',
    'insurance_number',
    'passport',
    'pet_description',
    'weight',
    'allergies',
    'blood_type',
    'hormonal_status',
    'obs',
  ],
  vets: [
    'email',
    'first_name',
    'last_name',
    'title',
    'phone',
    'status',
    'license_number',
    'created_at',
    'updated_at',
  ],
  appointments: [
    'patient_id',
    'vet_id',
    'service',
    'observations',
    'date',
    'duration',
    'reason',
    'notification_message',
    'user_note',
  ],
  records: [
    'date',
    'pet_id',
    'pet',
    'vet',
    'service',
    'diagnosis',
    'diagnosis_description',
    'presumptive_diagnosis',
    'treatment_description',
    'recommendations',
    'comments',
  ],
  prescriptions: [
    'record_id',
    'vet_id',
    'pet_id',
    'product_name',
    'quantity',
    'unit',
    'label',
    'recommendations',
    'prescribed_at',
    'expires_at',
    'status',
    'internal_notes',
    'created_at',
    'updated_at',
  ],
  reminders: [
    'pet_id',
    'protocol_name',
    'name',
    'administration_date',
    'due_date',
  ],
  sales: [
    'vet_id',
    'customer_id',
    'invoice_id',
    'subtotal',
    'total',
    'tax_amount',
    'amount_paid',
    'payment_type',
    'status',
    'payment_date',
    'created_at',
    'updated_at',
  ],
};

const REQUIRED_ONE_OF: Record<SupportedTable, string[]> = {
  clients: ['first_name', 'last_name', 'email', 'phone'],
  pets: ['nickname', 'chip_number', 'species'],
  vets: ['first_name', 'last_name', 'email', 'license_number'],
  appointments: ['service', 'date', 'reason'],
  records: ['pet', 'service', 'diagnosis', 'date'],
  prescriptions: ['product_name', 'label', 'status'],
  reminders: ['protocol_name', 'name', 'due_date'],
  sales: ['invoice_id', 'total', 'status'],
};

const FIELD_ALIASES: Record<string, string[]> = {
  first_name: ['firstname', 'prenume', 'nume_mic'],
  last_name: ['lastname', 'surname', 'nume'],
  phone: ['telefon', 'mobile', 'phone_number'],
  email: ['mail', 'email_address'],
  city: ['oras', 'localitate'],
  birthdate: ['data_nasterii', 'date_of_birth', 'dob'],
  nickname: ['pet_name', 'animal_name', 'nume_animal'],
  chip_number: ['microchip', 'chip', 'microchip_number'],
  species: ['specie', 'animal_type'],
  breed: ['rasa'],
  service: ['serviciu'],
  date: ['data'],
  diagnosis: ['diagnostic'],
  recommendations: ['recomandari'],
  invoice_id: ['invoice', 'factura'],
  status: ['stare'],
  due_date: ['scadenta', 'data_scadenta'],
};

export type ImportSourceType = 'csv' | 'json';

export interface MappingSuggestion {
  sourceField: string;
  targetField: string;
  confidence: number;
  reason: string;
}

export function isSupportedTable(value: string): value is SupportedTable {
  return SUPPORTED_TABLES.includes(value as SupportedTable);
}

export function parseCsvRows(csvText: string): Record<string, unknown>[] {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader(header) {
      return header.trim();
    },
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? 'CSV invalid.');
  }

  return parsed.data
    .filter((row) => Object.values(row).some((value) => String(value ?? '').trim().length > 0))
    .map((row) => ({ ...row }));
}

function normalizeField(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_');
}

function findBestFieldMatch(sourceField: string, targetFields: string[]): MappingSuggestion | null {
  const normalized = normalizeField(sourceField);
  if (!normalized) {
    return null;
  }

  for (const targetField of targetFields) {
    if (normalizeField(targetField) === normalized) {
      return {
        sourceField,
        targetField,
        confidence: 0.99,
        reason: 'Exact field-name match.',
      };
    }
  }

  for (const targetField of targetFields) {
    const aliases = FIELD_ALIASES[targetField] ?? [];
    if (aliases.some((alias) => normalizeField(alias) === normalized)) {
      return {
        sourceField,
        targetField,
        confidence: 0.96,
        reason: 'Alias match.',
      };
    }
  }

  for (const targetField of targetFields) {
    const targetNormalized = normalizeField(targetField);
    if (
      normalized.includes(targetNormalized) ||
      targetNormalized.includes(normalized)
    ) {
      return {
        sourceField,
        targetField,
        confidence: 0.9,
        reason: 'Partial field-name match.',
      };
    }
  }

  return null;
}

export function suggestFieldMapping(args: {
  sourceFields: string[];
  targetTable: SupportedTable;
}): { suggestions: MappingSuggestion[]; unmappedFields: string[] } {
  const targetFields = TARGET_FIELDS[args.targetTable];
  const suggestions: MappingSuggestion[] = [];
  const unmappedFields: string[] = [];

  for (const sourceField of args.sourceFields) {
    const suggestion = findBestFieldMatch(sourceField, targetFields);
    if (suggestion) {
      suggestions.push(suggestion);
    } else {
      unmappedFields.push(sourceField);
    }
  }

  return { suggestions, unmappedFields };
}

export function buildResolvedMapping(args: {
  targetTable: SupportedTable;
  suggestions: Array<{ source_field: string; target_field: string; confidence: Prisma.Decimal }>;
  mappingOverride?: Record<string, string>;
}) {
  const mapping: Record<string, string> = {};
  const allowed = new Set(TARGET_FIELDS[args.targetTable]);

  if (args.mappingOverride) {
    for (const [sourceField, targetField] of Object.entries(args.mappingOverride)) {
      if (sourceField.trim() && allowed.has(targetField)) {
        mapping[sourceField] = targetField;
      }
    }
  }

  for (const suggestion of args.suggestions) {
    if (mapping[suggestion.source_field]) {
      continue;
    }
    if (Number(suggestion.confidence) >= 0.9 && allowed.has(suggestion.target_field)) {
      mapping[suggestion.source_field] = suggestion.target_field;
    }
  }

  return mapping;
}

function toText(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value).trim();
}

function hasAtLeastOneMappedValue(data: Record<string, unknown>, requiredAny: string[]) {
  return requiredAny.some((field) => toText(data[field]).length > 0);
}

export function mapRowToTarget(args: {
  targetTable: SupportedTable;
  raw: Record<string, unknown>;
  mapping: Record<string, string>;
}) {
  const mapped: Record<string, unknown> = {};
  const extraFields: Record<string, unknown> = {};

  for (const [sourceField, value] of Object.entries(args.raw)) {
    const targetField = args.mapping[sourceField];
    if (!targetField) {
      extraFields[sourceField] = value;
      continue;
    }

    mapped[targetField] = value;
  }

  if (!hasAtLeastOneMappedValue(mapped, REQUIRED_ONE_OF[args.targetTable])) {
    return {
      ok: false as const,
      error: 'Rând invalid: nu conține câmpuri minime pentru entitatea țintă.',
      mapped,
      extraFields,
    };
  }

  return {
    ok: true as const,
    mapped,
    extraFields,
  };
}

export async function writeImportAudit(args: {
  clinicId: string;
  actorUserId: string;
  action: string;
  recordId?: string | null;
  payload?: Prisma.JsonObject;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        clinic_id: args.clinicId,
        actor_user_id: args.actorUserId,
        table_name: 'import_jobs',
        action: args.action,
        record_id: args.recordId ?? null,
        payload: args.payload ?? {},
      },
    });
  } catch {
    // Import flow should continue even if audit logging fails.
  }
}

export async function loadMappedRecord(args: {
  clinicId: string;
  targetTable: SupportedTable;
  mapped: Record<string, unknown>;
}) {
  const delegate = getTableDelegate(args.targetTable);
  const data = prepareMutationData(args.targetTable, args.mapped, args.clinicId);
  return delegate.create({ data });
}

export function pickJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function pickStringMap(value: unknown): Record<string, string> {
  const input = pickJsonObject(value);
  const output: Record<string, string> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (!key.trim() || typeof raw !== 'string') {
      continue;
    }
    const next = raw.trim();
    if (!next) {
      continue;
    }
    output[key] = next;
  }
  return output;
}
