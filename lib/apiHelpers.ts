import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext } from './auth';
import {
  buildListWhere,
  buildScopedIdWhere,
  getTableDelegate,
  parseRecordId,
  prepareMutationData,
  serializeForJson,
  SupportedTable,
} from './prismaTables';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function invalidIdResponse() {
  return badRequest('ID invalid.');
}

export function listRoute(table: SupportedTable) {
  return async function GET(req: NextRequest) {
    const { context, response } = await getRequestAuthContext(req);
    if (!context) {
      return response!;
    }

    const { session } = context;
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') ?? '').trim().slice(0, 100);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '200', 10) || 200), 5000);
    const offset = (page - 1) * limit;

    try {
      const delegate = getTableDelegate(table);
      const where = buildListWhere(table, session.clinicId, search);
      const [data, total] = await Promise.all([
        delegate.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { id: 'asc' },
        }),
        delegate.count({ where }),
      ]);

      const apiResponse = NextResponse.json({
        data: serializeForJson(data),
        total,
      });
      applyAuthContextCookies(apiResponse, context);
      return apiResponse;
    } catch (error) {
      console.error(`[${table}] list error:`, error);
      return NextResponse.json({ error: 'Eroare la încărcarea datelor' }, { status: 500 });
    }
  };
}

export function createRoute(table: SupportedTable) {
  return async function POST(req: NextRequest) {
    const { context, response } = await getRequestAuthContext(req);
    if (!context) {
      return response!;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return badRequest('Format JSON invalid');
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('Payload invalid.');
    }

    try {
      const delegate = getTableDelegate(table);
      const data = prepareMutationData(table, body as Record<string, unknown>, context.session.clinicId);
      const created = await delegate.create({ data });

      const apiResponse = NextResponse.json(serializeForJson(created), { status: 201 });
      applyAuthContextCookies(apiResponse, context);
      return apiResponse;
    } catch (error) {
      console.error(`[${table}] create error:`, error);
      const isInvalidField =
        error instanceof Error && error.message.startsWith('Câmp numeric invalid');
      const message = isInvalidField ? error.message : 'Eroare la crearea înregistrării';
      return NextResponse.json({ error: message }, { status: isInvalidField ? 400 : 500 });
    }
  };
}

export function getOneRoute(table: SupportedTable) {
  return async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { context, response } = await getRequestAuthContext(req);
    if (!context) {
      return response!;
    }

    const { id } = await params;
    const recordId = parseRecordId(id);
    if (recordId === null) {
      return invalidIdResponse();
    }

    try {
      const delegate = getTableDelegate(table);
      const data = await delegate.findFirst({
        where: buildScopedIdWhere(table, context.session.clinicId, recordId),
      });

      if (!data) {
        return NextResponse.json({ error: 'Înregistrare negăsită' }, { status: 404 });
      }

      const apiResponse = NextResponse.json(serializeForJson(data));
      applyAuthContextCookies(apiResponse, context);
      return apiResponse;
    } catch (error) {
      console.error(`[${table}] get error:`, error);
      return NextResponse.json({ error: 'Eroare la încărcarea înregistrării' }, { status: 500 });
    }
  };
}

export function updateRoute(table: SupportedTable) {
  return async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { context, response } = await getRequestAuthContext(req);
    if (!context) {
      return response!;
    }

    const { id } = await params;
    const recordId = parseRecordId(id);
    if (recordId === null) {
      return invalidIdResponse();
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return badRequest('Format JSON invalid');
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('Payload invalid.');
    }

    try {
      const delegate = getTableDelegate(table);
      const data = prepareMutationData(table, body as Record<string, unknown>, context.session.clinicId);
      const result = await delegate.updateMany({
        where: buildScopedIdWhere(table, context.session.clinicId, recordId),
        data,
      });

      if (result.count === 0) {
        return NextResponse.json({ error: 'Înregistrare negăsită' }, { status: 404 });
      }

      const updated = await delegate.findUnique({
        where: { id: recordId },
      });

      if (!updated) {
        return NextResponse.json({ error: 'Înregistrare negăsită' }, { status: 404 });
      }

      const apiResponse = NextResponse.json(serializeForJson(updated));
      applyAuthContextCookies(apiResponse, context);
      return apiResponse;
    } catch (error) {
      console.error(`[${table}] update error:`, error);
      const isInvalidField =
        error instanceof Error && error.message.startsWith('Câmp numeric invalid');
      const message = isInvalidField ? error.message : 'Eroare la actualizarea înregistrării';
      return NextResponse.json({ error: message }, { status: isInvalidField ? 400 : 500 });
    }
  };
}

export function deleteRoute(table: SupportedTable) {
  return async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { context, response } = await getRequestAuthContext(req);
    if (!context) {
      return response!;
    }

    const { id } = await params;
    const recordId = parseRecordId(id);
    if (recordId === null) {
      return invalidIdResponse();
    }

    try {
      const delegate = getTableDelegate(table);
      const result = await delegate.deleteMany({
        where: buildScopedIdWhere(table, context.session.clinicId, recordId),
      });

      if (result.count === 0) {
        return NextResponse.json({ error: 'Înregistrare negăsită' }, { status: 404 });
      }

      const apiResponse = NextResponse.json({ success: true });
      applyAuthContextCookies(apiResponse, context);
      return apiResponse;
    } catch (error) {
      console.error(`[${table}] delete error:`, error);
      return NextResponse.json({ error: 'Eroare la ștergerea înregistrării' }, { status: 500 });
    }
  };
}
