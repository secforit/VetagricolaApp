import { getOneRoute, updateRoute, deleteRoute } from '@/lib/apiHelpers';
export const GET = getOneRoute('appointments');
export const PUT = updateRoute('appointments');
export const DELETE = deleteRoute('appointments');
