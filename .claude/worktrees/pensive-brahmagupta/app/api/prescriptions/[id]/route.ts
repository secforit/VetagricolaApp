import { getOneRoute, updateRoute, deleteRoute } from '@/lib/apiHelpers';
export const GET = getOneRoute('prescriptions');
export const PUT = updateRoute('prescriptions');
export const DELETE = deleteRoute('prescriptions');
