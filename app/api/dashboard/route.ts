import { NextRequest, NextResponse } from 'next/server';
import { applyAuthContextCookies, getRequestAuthContext } from '@/lib/auth';
import { BUSINESS_TABLES, getTableDelegate } from '@/lib/prismaTables';

export async function GET(req: NextRequest) {
  const { context, response } = await getRequestAuthContext(req);
  if (!context) {
    return response!;
  }

  const { session } = context;
  const counts: Record<string, number> = {};

  await Promise.all(
    BUSINESS_TABLES.map(async (table) => {
      const delegate = getTableDelegate(table);
      counts[table] = await delegate.count({
        where: {
          clinic_id: session.clinicId,
        },
      });
    })
  );

  const apiResponse = NextResponse.json(counts);
  applyAuthContextCookies(apiResponse, context);
  return apiResponse;
}
