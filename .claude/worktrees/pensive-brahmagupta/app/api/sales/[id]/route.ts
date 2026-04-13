import { getOneRoute, updateRoute, deleteRoute } from '@/lib/apiHelpers';
export const GET = getOneRoute('sales');
export const PUT = updateRoute('sales');
export const DELETE = deleteRoute('sales');
