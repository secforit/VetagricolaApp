import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  if (context.session.role !== 'clinic_admin') {
    const denied = NextResponse.json({ error: 'Doar administratorii pot vedea detaliile importului.' }, { status: 403 });
    applyAuthContextCookies(denied, context);
    return denied;
  }

  const { id } = await params;

  const job = await prisma.importJob.findFirst({
    where: {
      id,
      clinic_id: context.session.clinicId,
    },
    select: {
      id: true,
      source_type: true,
      source_name: true,
      target_table: true,
      status: true,
      summary_json: true,
      idempotency_key: true,
      started_at: true,
      finished_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job de import negăsit.' }, { status: 404 });
  }

  const [rowsTotal, rowsLoaded, rowsError, suggestionsCount] = await Promise.all([
    prisma.importJobRow.count({
      where: { job_id: id, clinic_id: context.session.clinicId },
    }),
    prisma.importJobRow.count({
      where: { job_id: id, clinic_id: context.session.clinicId, status: 'loaded' },
    }),
    prisma.importJobRow.count({
      where: { job_id: id, clinic_id: context.session.clinicId, status: 'error' },
    }),
    prisma.importMappingSuggestion.count({
      where: { job_id: id, clinic_id: context.session.clinicId },
    }),
  ]);

  const recentErrors = await prisma.importJobRow.findMany({
    where: {
      job_id: id,
      clinic_id: context.session.clinicId,
      status: 'error',
    },
    orderBy: {
      source_row_index: 'asc',
    },
    take: 20,
    select: {
      id: true,
      source_row_index: true,
      error_message: true,
    },
  });

  const apiResponse = NextResponse.json({
    data: {
      ...job,
      counters: {
        rowsTotal,
        rowsLoaded,
        rowsError,
        suggestionsCount,
      },
      recentErrors,
    },
  });
  applyAuthContextCookies(apiResponse, context);
  return apiResponse;
}
