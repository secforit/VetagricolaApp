import { getOneRoute, updateRoute, deleteRoute } from '@/lib/apiHelpers';
export const GET = getOneRoute('records');
export const PUT = updateRoute('records');
export const DELETE = deleteRoute('records');
