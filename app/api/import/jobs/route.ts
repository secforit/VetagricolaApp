import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  isSupportedTable,
  parseCsvRows,
  pickJsonObject,
  writeImportAudit,
} from '@/lib/imports';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    const denied = NextResponse.json({ error: 'Doar administratorii pot vedea joburile de import.' }, { status: 403 });
    applyAuthContextCookies(denied, context);
    return denied;
  }

  const jobs = await prisma.importJob.findMany({
    where: {
      clinic_id: context.session.clinicId,
    },
    orderBy: {
      created_at: 'desc',
    },
    select: {
      id: true,
      source_type: true,
      source_name: true,
      target_table: true,
      status: true,
      idempotency_key: true,
      summary_json: true,
      started_at: true,
      finished_at: true,
      created_at: true,
      updated_at: true,
    },
    take: 50,
  });

  const apiResponse = NextResponse.json({ data: jobs });
  applyAuthContextCookies(apiResponse, context);
  return apiResponse;
}

export async function POST(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    const denied = NextResponse.json({ error: 'Doar administratorii pot crea importuri.' }, { status: 403 });
    applyAuthContextCookies(denied, context);
    return denied;
  }

  let body: Record<string, unknown>;
  try {
    body = pickJsonObject(await req.json());
  } catch {
    return badRequest('Format JSON invalid.');
  }

  const sourceType = String(body.sourceType ?? '').trim().toLowerCase();
  const sourceName = String(body.sourceName ?? '').trim();
  const targetTableRaw = String(body.targetTable ?? '').trim();
  const idempotencyKey = String(body.idempotencyKey ?? '').trim() || null;
  const rowsRaw = body.rows;
  const csvText = typeof body.csvText === 'string' ? body.csvText : null;

  if (!sourceType || !['csv', 'json'].includes(sourceType)) {
    return badRequest('sourceType trebuie să fie `csv` sau `json`.');
  }

  if (!sourceName) {
    return badRequest('sourceName este obligatoriu.');
  }

  if (!isSupportedTable(targetTableRaw)) {
    return badRequest('targetTable invalid.');
  }

  let rows: Record<string, unknown>[] = [];
  if (Array.isArray(rowsRaw)) {
    rows = rowsRaw
      .map((item) => pickJsonObject(item))
      .filter((item) => Object.keys(item).length > 0);
  } else if (csvText) {
    try {
      rows = parseCsvRows(csvText);
    } catch (error) {
      return badRequest(error instanceof Error ? error.message : 'CSV invalid.');
    }
  }

  if (rows.length === 0) {
    return badRequest('Importul necesită cel puțin un rând de date.');
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const job = await tx.importJob.create({
        data: {
          clinic_id: context.session.clinicId,
          source_type: sourceType,
          source_name: sourceName,
          target_table: targetTableRaw,
          status: 'draft',
          idempotency_key: idempotencyKey,
          created_by: context.session.userId,
          summary_json: {
            rowCount: rows.length,
            sourceType,
            targetTable: targetTableRaw,
          } as Prisma.JsonObject,
        },
        select: {
          id: true,
          status: true,
          target_table: true,
          created_at: true,
        },
      });

      await tx.importJobRow.createMany({
        data: rows.map((rawPayload, index) => ({
          clinic_id: context.session.clinicId,
          job_id: job.id,
          source_row_index: index,
          raw_payload: rawPayload as Prisma.InputJsonObject,
          normalized_payload: {} as Prisma.InputJsonObject,
          status: 'pending',
          target_table: targetTableRaw,
        })),
      });

      return job;
    });

    await writeImportAudit({
      clinicId: context.session.clinicId,
      actorUserId: context.session.userId,
      action: 'import_job_created',
      recordId: created.id,
      payload: {
        source_type: sourceType,
        source_name: sourceName,
        target_table: targetTableRaw,
        row_count: rows.length,
      },
    });

    const apiResponse = NextResponse.json(
      {
        ok: true,
        data: created,
      },
      { status: 201 }
    );
    applyAuthContextCookies(apiResponse, context);
    return apiResponse;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Există deja un import cu acest idempotency key pentru clinica activă.' },
        { status: 409 }
      );
    }

    console.error('[import.jobs.create] error:', error);
    return NextResponse.json({ error: 'Nu am putut crea jobul de import.' }, { status: 500 });
  }
}
