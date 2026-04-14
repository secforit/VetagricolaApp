import { listRoute, createRoute } from '@/lib/apiHelpers';
export const GET = listRoute('vets');
export const POST = createRoute('vets');
