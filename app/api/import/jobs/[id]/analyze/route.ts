import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  isSupportedTable,
  pickJsonObject,
  suggestFieldMapping,
  writeImportAudit,
} from '@/lib/imports';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    const denied = NextResponse.json({ error: 'Doar administratorii pot analiza importuri.' }, { status: 403 });
    applyAuthContextCookies(denied, context);
    return denied;
  }

  const { id } = await params;
  const body = pickJsonObject(await req.json().catch(() => ({})));
  const force = body.force === true;

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

  if (!force && job.status !== 'draft' && job.status !== 'analyzed') {
    return NextResponse.json(
      { error: 'Analiza este permisă doar pentru joburi în starea draft/analyzed. Folosește force=true pentru re-analiză.' },
      { status: 409 }
    );
  }

  const rows = await prisma.importJobRow.findMany({
    where: {
      job_id: job.id,
      clinic_id: context.session.clinicId,
    },
    select: {
      raw_payload: true,
    },
    take: 3000,
  });

  const sourceFields = new Set<string>();
  for (const row of rows) {
    const payload = pickJsonObject(row.raw_payload);
    for (const key of Object.keys(payload)) {
      const trimmed = key.trim();
      if (trimmed) {
        sourceFields.add(trimmed);
      }
    }
  }

  const { suggestions, unmappedFields } = suggestFieldMapping({
    sourceFields: [...sourceFields],
    targetTable: job.target_table,
  });

  await prisma.$transaction(async (tx) => {
    await tx.importMappingSuggestion.deleteMany({
      where: {
        job_id: job.id,
        clinic_id: context.session.clinicId,
      },
    });

    if (suggestions.length > 0) {
      await tx.importMappingSuggestion.createMany({
        data: suggestions.map((suggestion) => ({
          clinic_id: context.session.clinicId,
          job_id: job.id,
          source_field: suggestion.sourceField,
          target_table: job.target_table,
          target_field: suggestion.targetField,
          confidence: new Prisma.Decimal(suggestion.confidence),
          reason: suggestion.reason,
          accepted: suggestion.confidence >= 0.9 ? true : null,
        })),
      });
    }

    await tx.importJob.update({
      where: { id: job.id },
      data: {
        status: 'analyzed',
        summary_json: {
          sourceFieldCount: sourceFields.size,
          suggestionCount: suggestions.length,
          unmappedFieldCount: unmappedFields.length,
          unmappedFields,
        } as Prisma.InputJsonObject,
      },
    });
  });

  await writeImportAudit({
    clinicId: context.session.clinicId,
    actorUserId: context.session.userId,
    action: 'import_job_analyzed',
    recordId: job.id,
    payload: {
      source_field_count: sourceFields.size,
      suggestion_count: suggestions.length,
      unmapped_field_count: unmappedFields.length,
    },
  });

  const apiResponse = NextResponse.json({
    ok: true,
    data: {
      sourceFieldCount: sourceFields.size,
      suggestions,
      unmappedFields,
    },
  });
  applyAuthContextCookies(apiResponse, context);
  return apiResponse;
}
