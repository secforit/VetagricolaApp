import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  buildResolvedMapping,
  isSupportedTable,
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
    const denied = NextResponse.json({ error: 'Doar administratorii pot rula dry-run import.' }, { status: 403 });
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
      summary_json: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job de import negăsit.' }, { status: 404 });
  }

  if (!isSupportedTable(job.target_table)) {
    return NextResponse.json({ error: 'target_table invalid pentru acest job.' }, { status: 400 });
  }

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

  const rowUpdates: Array<{
    id: string;
    status: 'validated' | 'error';
    normalized_payload: Prisma.InputJsonObject;
    error_message: string | null;
  }> = [];

  let validatedCount = 0;
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
      rowUpdates.push({
        id: row.id,
        status: 'error',
        normalized_payload: {
          target: mapped.mapped,
          extra_fields: mapped.extraFields,
        } as Prisma.InputJsonObject,
        error_message: mapped.error,
      });
      continue;
    }

    validatedCount += 1;
    rowUpdates.push({
      id: row.id,
      status: 'validated',
      normalized_payload: {
        target: mapped.mapped,
        extra_fields: mapped.extraFields,
      } as Prisma.InputJsonObject,
      error_message: null,
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const rowUpdate of rowUpdates) {
      await tx.importJobRow.update({
        where: { id: rowUpdate.id },
        data: {
          status: rowUpdate.status,
          normalized_payload: rowUpdate.normalized_payload,
          error_message: rowUpdate.error_message,
        },
      });
    }

    await tx.importJob.update({
      where: { id: job.id },
      data: {
        status: 'dry_run_ready',
        summary_json: {
          ...pickJsonObject(job.summary_json),
          dryRun: {
            total: rows.length,
            validated: validatedCount,
            errors: errorCount,
          },
        } as Prisma.InputJsonObject,
      },
    });
  });

  await writeImportAudit({
    clinicId: context.session.clinicId,
    actorUserId: context.session.userId,
    action: 'import_job_dry_run',
    recordId: job.id,
    payload: {
      total_rows: rows.length,
      validated_rows: validatedCount,
      error_rows: errorCount,
    },
  });

  const errorPreview = rowUpdates
    .filter((row) => row.status === 'error')
    .slice(0, 30)
    .map((row) => ({
      rowId: row.id,
      error: row.error_message,
    }));

  const apiResponse = NextResponse.json({
    ok: true,
    data: {
      totalRows: rows.length,
      validatedRows: validatedCount,
      errorRows: errorCount,
      mapping: resolvedMapping,
      errors: errorPreview,
    },
  });
  applyAuthContextCookies(apiResponse, context);
  return apiResponse;
}
