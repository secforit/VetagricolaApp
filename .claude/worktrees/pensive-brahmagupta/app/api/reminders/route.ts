import { listRoute, createRoute } from '@/lib/apiHelpers';
export const GET = listRoute('reminders');
export const POST = createRoute('reminders');
