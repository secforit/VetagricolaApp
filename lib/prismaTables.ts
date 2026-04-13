import prisma from './prisma';

type Delegate = {
  findMany(args?: Record<string, unknown>): Promise<unknown[]>;
  count(args?: Record<string, unknown>): Promise<number>;
  findFirst(args?: Record<string, unknown>): Promise<unknown | null>;
  findUnique(args?: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  deleteMany(args: Record<string, unknown>): Promise<{ count: number }>;
};

const TABLE_CONFIG = {
  clients: {
    delegate: 'client',
    searchableColumns: ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'obs'],
    bigintFields: ['id'],
  },
  pets: {
    delegate: 'pet',
    searchableColumns: ['nickname', 'species', 'breed', 'color', 'chip_number', 'obs'],
    bigintFields: ['id', 'client_id'],
  },
  vets: {
    delegate: 'vet',
    searchableColumns: ['first_name', 'last_name', 'email', 'phone', 'license_number'],
    bigintFields: ['id'],
  },
  appointments: {
    delegate: 'appointment',
    searchableColumns: ['service', 'observations', 'reason', 'user_note'],
    bigintFields: ['id', 'patient_id', 'vet_id'],
  },
  records: {
    delegate: 'medicalRecord',
    searchableColumns: ['pet', 'vet', 'service', 'diagnosis', 'comments'],
    bigintFields: ['id', 'pet_id'],
  },
  prescriptions: {
    delegate: 'prescription',
    searchableColumns: ['product_name', 'label', 'recommendations', 'status'],
    bigintFields: ['id', 'record_id', 'vet_id', 'pet_id'],
  },
  reminders: {
    delegate: 'reminder',
    searchableColumns: ['protocol_name', 'name'],
    bigintFields: ['id', 'pet_id'],
  },
  sales: {
    delegate: 'sale',
    searchableColumns: ['invoice_id', 'payment_type', 'status'],
    bigintFields: ['id', 'vet_id', 'customer_id'],
  },
} as const;

export type SupportedTable = keyof typeof TABLE_CONFIG;

export const BUSINESS_TABLES = Object.keys(TABLE_CONFIG) as SupportedTable[];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function toSafeBigIntNumber(value: bigint) {
  const asNumber = Number(value);
  return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
}

export function serializeForJson<T>(value: T): T {
  if (typeof value === 'bigint') {
    return toSafeBigIntNumber(value) as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeForJson(entry)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeForJson(entry)])
    ) as T;
  }

  return value;
}

function coerceBigIntField(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return BigInt(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^-?\d+$/.test(trimmed)) {
      return BigInt(trimmed);
    }
  }

  throw new Error(`Câmp numeric invalid: ${fieldName}`);
}

function buildClinicWhere(clinicId: string) {
  return { clinic_id: clinicId };
}

export function getTableDelegate(table: SupportedTable): Delegate {
  const delegateName = TABLE_CONFIG[table].delegate;
  return prisma[delegateName] as unknown as Delegate;
}

export function buildListWhere(table: SupportedTable, clinicId: string, search: string) {
  const config = TABLE_CONFIG[table];
  const where: Record<string, unknown> = buildClinicWhere(clinicId);

  if (search) {
    where.OR = config.searchableColumns.map((column) => ({
      [column]: {
        contains: search,
        mode: 'insensitive',
      },
    }));
  }

  return where;
}

export function buildScopedIdWhere(table: SupportedTable, clinicId: string, id: bigint) {
  return {
    id,
    ...buildClinicWhere(clinicId),
  };
}

export function parseRecordId(rawId: string): bigint | null {
  const trimmed = rawId.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  return BigInt(trimmed);
}

export function prepareMutationData(
  table: SupportedTable,
  body: Record<string, unknown>,
  clinicId: string
) {
  const config = TABLE_CONFIG[table];
  const data: Record<string, unknown> = { ...body, clinic_id: clinicId };

  delete data.id;

  for (const field of config.bigintFields) {
    if (field === 'id') {
      continue;
    }

    if (field in data) {
      const coerced = coerceBigIntField(data[field], field);
      if (coerced === undefined) {
        delete data[field];
      } else {
        data[field] = coerced;
      }
    }
  }

  return data;
}
