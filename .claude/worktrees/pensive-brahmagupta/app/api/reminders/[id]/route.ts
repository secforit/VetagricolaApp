import { getOneRoute, updateRoute, deleteRoute } from '@/lib/apiHelpers';
export const GET = getOneRoute('reminders');
export const PUT = updateRoute('reminders');
export const DELETE = deleteRoute('reminders');
