import { getOneRoute, updateRoute, deleteRoute } from '@/lib/apiHelpers';
export const GET = getOneRoute('clients');
export const PUT = updateRoute('clients');
export const DELETE = deleteRoute('clients');
