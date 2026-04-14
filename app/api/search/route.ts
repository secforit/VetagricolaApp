import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import { buildListWhere, getTableDelegate, SupportedTable } from '@/lib/prismaTables';

type SearchResult = {
  key: string;
  section: SupportedTable;
  sectionLabel: string;
  title: string;
  subtitle: string;
  href: string;
};

const SECTION_LABELS: Record<SupportedTable, string> = {
  clients: 'Clienți',
  pets: 'Animale',
  vets: 'Veterinari',
  appointments: 'Programări',
  records: 'Fișe medicale',
  prescriptions: 'Rețete',
  reminders: 'Remindere',
  sales: 'Vânzări',
};

const TABLE_ORDER: SupportedTable[] = [
  'clients',
  'pets',
  'appointments',
  'records',
  'prescriptions',
  'vets',
  'reminders',
  'sales',
];

function asText(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function pick(...values: unknown[]) {
  for (const value of values) {
    const text = asText(value);
    if (text) {
      return text;
    }
  }

  return '';
}

function buildResult(table: SupportedTable, row: Record<string, unknown>, q: string): SearchResult {
  const id = asText(row.id) || '0';
  const sectionLabel = SECTION_LABELS[table];

  switch (table) {
    case 'clients': {
      const fullName = pick(
        `${asText(row.first_name)} ${asText(row.last_name)}`.trim(),
        row.email,
        row.phone
      );
      const title = fullName || `Client #${id}`;
      const subtitle = pick(row.email, row.phone, row.city, 'Client clinică');
      return {
        key: `${table}:${id}`,
        section: table,
        sectionLabel,
        title,
        subtitle,
        href: `/clients?search=${encodeURIComponent(fullName || q)}`,
      };
    }
    case 'pets': {
      const name = pick(row.nickname, row.chip_number, row.species);
      const title = name || `Animal #${id}`;
      const subtitle = pick(row.species, row.breed, row.chip_number, 'Animal clinică');
      return {
        key: `${table}:${id}`,
        section: table,
        sectionLabel,
        title,
        subtitle,
        href: `/pets?search=${encodeURIComponent(name || q)}`,
      };
    }
    case 'appointments': {
      const name = pick(row.service, row.reason);
      const title = name || `Programare #${id}`;
      const subtitle = pick(row.date, row.reason, row.observations, 'Programare');
      return {
        key: `${table}:${id}`,
        section: table,
        sectionLabel,
        title,
        subtitle,
        href: `/appointments?search=${encodeURIComponent(name || q)}`,
      };
    }
    case 'records': {
      const name = pick(row.diagnosis, row.service, row.pet);
      const title = name || `Fișă #${id}`;
      const subtitle = pick(row.pet, row.vet, row.comments, 'Fișă medicală');
      return {
        key: `${table}:${id}`,
        section: table,
        sectionLabel,
        title,
        subtitle,
        href: `/records?search=${encodeURIComponent(name || q)}`,
      };
    }
    case 'prescriptions': {
      const name = pick(row.product_name, row.label, row.status);
      const title = name || `Rețetă #${id}`;
      const subtitle = pick(row.status, row.recommendations, 'Prescripție');
      return {
        key: `${table}:${id}`,
        section: table,
        sectionLabel,
        title,
        subtitle,
        href: `/prescriptions?search=${encodeURIComponent(name || q)}`,
      };
    }
    case 'vets': {
      const fullName = pick(
        `${asText(row.first_name)} ${asText(row.last_name)}`.trim(),
        row.email,
        row.phone
      );
      const title = fullName || `Veterinar #${id}`;
      const subtitle = pick(row.email, row.license_number, row.phone, 'Medic veterinar');
      return {
        key: `${table}:${id}`,
        section: table,
        sectionLabel,
        title,
        subtitle,
        href: `/vets?search=${encodeURIComponent(fullName || q)}`,
      };
    }
    case 'reminders': {
      const name = pick(row.protocol_name, row.name, row.due_date);
      const title = name || `Reminder #${id}`;
      const subtitle = pick(row.due_date, row.administration_date, 'Reminder');
      return {
        key: `${table}:${id}`,
        section: table,
        sectionLabel,
        title,
        subtitle,
        href: `/reminders?search=${encodeURIComponent(name || q)}`,
      };
    }
    case 'sales': {
      const name = pick(row.invoice_id, row.status, row.payment_type);
      const title = name || `Vânzare #${id}`;
      const subtitle = pick(row.status, row.payment_date, row.total, 'Vânzare');
      return {
        key: `${table}:${id}`,
        section: table,
        sectionLabel,
        title,
        subtitle,
        href: `/sales?search=${encodeURIComponent(name || q)}`,
      };
    }
    default:
      return {
        key: `${table}:${id}`,
        section: table,
        sectionLabel,
        title: `Rezultat #${id}`,
        subtitle: sectionLabel,
        href: `/${table}?search=${encodeURIComponent(q)}`,
      };
  }
}

export async function GET(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim().slice(0, 100);

  if (q.length < 2) {
    const emptyResponse = NextResponse.json({ data: [] as SearchResult[] });
    applyAuthContextCookies(emptyResponse, context);
    return emptyResponse;
  }

  try {
    const limitPerTable = 4;
    const all = await Promise.all(
      TABLE_ORDER.map(async (table) => {
        const delegate = getTableDelegate(table);
        const rows = (await delegate.findMany({
          where: buildListWhere(table, context.session.clinicId, q),
          take: limitPerTable,
          orderBy: { id: 'desc' },
        })) as Record<string, unknown>[];

        return rows.map((row) => buildResult(table, row, q));
      })
    );

    const data = all.flat().slice(0, 24);
    const apiResponse = NextResponse.json({ data });
    applyAuthContextCookies(apiResponse, context);
    return apiResponse;
  } catch (error) {
    console.error('[search] error:', error);
    return NextResponse.json({ error: 'Eroare la căutarea globală.' }, { status: 500 });
  }
}
