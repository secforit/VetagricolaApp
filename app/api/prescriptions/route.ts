import { listRoute, createRoute } from '@/lib/apiHelpers';
export const GET = listRoute('prescriptions');
export const POST = createRoute('prescriptions');
