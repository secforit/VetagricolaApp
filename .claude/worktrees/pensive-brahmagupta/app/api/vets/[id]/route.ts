import { getOneRoute, updateRoute, deleteRoute } from '@/lib/apiHelpers';
export const GET = getOneRoute('vets');
export const PUT = updateRoute('vets');
export const DELETE = deleteRoute('vets');
