import { listRoute, createRoute } from '@/lib/apiHelpers';
export const GET = listRoute('pets');
export const POST = createRoute('pets');
