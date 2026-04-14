import { listRoute, createRoute } from '@/lib/apiHelpers';
export const GET = listRoute('appointments');
export const POST = createRoute('appointments');
