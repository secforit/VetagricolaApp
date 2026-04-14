import { getOneRoute, updateRoute, deleteRoute } from '@/lib/apiHelpers';
export const GET = getOneRoute('pets');
export const PUT = updateRoute('pets');
export const DELETE = deleteRoute('pets');
