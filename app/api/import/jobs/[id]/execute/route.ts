import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  buildResolvedMapping,
  isSupportedTable,
  loadMappedRecord,
  mapRowToTarget,
  pickJsonObject,
  pickStringMap,
  writeImportAudit,
} from '@/lib/imports';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    const denied = NextResponse.json({ error: 'Doar administratorii pot executa importuri.' }, { status: 403 });
    applyAuthContextCookies(denied, context);
    return denied;
  }

  const { id } = await params;
  const body = pickJsonObject(await req.json().catch(() => ({})));
  const mappingOverride = pickStringMap(body.mappingOverride);

  const job = await prisma.importJob.findFirst({
    where: {
      id,
      clinic_id: context.session.clinicId,
    },
    select: {
      id: true,
      clinic_id: true,
      target_table: true,
      status: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job de import negăsit.' }, { status: 404 });
  }

  if (!isSupportedTable(job.target_table)) {
    return NextResponse.json({ error: 'target_table invalid pentru acest job.' }, { status: 400 });
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: 'running',
      started_at: new Date(),
    },
  });

  const [rows, suggestions] = await Promise.all([
    prisma.importJobRow.findMany({
      where: {
        job_id: job.id,
        clinic_id: context.session.clinicId,
      },
      orderBy: {
        source_row_index: 'asc',
      },
      select: {
        id: true,
        source_row_index: true,
        raw_payload: true,
      },
    }),
    prisma.importMappingSuggestion.findMany({
      where: {
        job_id: job.id,
        clinic_id: context.session.clinicId,
      },
      select: {
        source_field: true,
        target_field: true,
        confidence: true,
      },
    }),
  ]);

  const resolvedMapping = buildResolvedMapping({
    targetTable: job.target_table,
    suggestions,
    mappingOverride,
  });

  let loadedCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const raw = pickJsonObject(row.raw_payload);
    const mapped = mapRowToTarget({
      targetTable: job.target_table,
      raw,
      mapping: resolvedMapping,
    });

    if (!mapped.ok) {
      errorCount += 1;
      await prisma.importJobRow.update({
        where: { id: row.id },
        data: {
          status: 'error',
          normalized_payload: {
            target: mapped.mapped,
            extra_fields: mapped.extraFields,
          } as Prisma.InputJsonObject,
          error_message: mapped.error,
        },
      });
      continue;
    }

    try {
      const createdRecord = await loadMappedRecord({
        clinicId: context.session.clinicId,
        targetTable: job.target_table,
        mapped: mapped.mapped,
      });

      loadedCount += 1;
      await prisma.importJobRow.update({
        where: { id: row.id },
        data: {
          status: 'loaded',
          normalized_payload: {
            target: mapped.mapped,
            extra_fields: mapped.extraFields,
          } as Prisma.InputJsonObject,
          error_message: null,
        },
      });

      await writeImportAudit({
        clinicId: context.session.clinicId,
        actorUserId: context.session.userId,
        action: 'import_row_loaded',
        recordId: job.id,
        payload: {
          import_row_id: row.id,
          source_row_index: row.source_row_index,
          target_table: job.target_table,
          created_record_id: String((createdRecord as { id?: unknown }).id ?? ''),
        },
      });
    } catch (error) {
      errorCount += 1;
      await prisma.importJobRow.update({
        where: { id: row.id },
        data: {
          status: 'error',
          normalized_payload: {
            target: mapped.mapped,
            extra_fields: mapped.extraFields,
          } as Prisma.InputJsonObject,
          error_message:
            error instanceof Error
              ? error.message.slice(0, 500)
              : 'Eroare la încărcarea rândului.',
        },
      });
    }
  }

  const finalStatus = errorCount > 0 ? 'completed_with_errors' : 'completed';
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: finalStatus,
      finished_at: new Date(),
      summary_json: {
        execution: {
          total: rows.length,
          loaded: loadedCount,
          errors: errorCount,
        },
      } as Prisma.InputJsonObject,
    },
  });

  await writeImportAudit({
    clinicId: context.session.clinicId,
    actorUserId: context.session.userId,
    action: 'import_job_executed',
    recordId: job.id,
    payload: {
      status: finalStatus,
      total_rows: rows.length,
      loaded_rows: loadedCount,
      error_rows: errorCount,
      target_table: job.target_table,
    },
  });

  const apiResponse = NextResponse.json({
    ok: true,
    data: {
      status: finalStatus,
      totalRows: rows.length,
      loadedRows: loadedCount,
      errorRows: errorCount,
    },
  });
  applyAuthContextCookies(apiResponse, context);
  return apiResponse;
}
