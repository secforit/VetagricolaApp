import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

const SMSO_API_KEY = process.env.SMSO_API_KEY!;
const SMSO_SENDER = process.env.SMSO_SENDER!;
const CRON_SECRET = process.env.CRON_SECRET!;

const DAYS_BEFORE_14 = 14;
const DAYS_BEFORE_2 = 2;

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('https://app.smso.ro/api/v1/send', {
    method: 'POST',
    headers: {
      'X-Authorization': SMSO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      sender: Number(SMSO_SENDER),
      body,
      type: 'transactional',
      remove_special_chars: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: (err as { message?: string }).message ?? res.statusText };
  }
  return { ok: true };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const today = new Date().toISOString().slice(0, 10);

  // Window for 14-day reminders: today → today + 14
  const target14 = new Date();
  target14.setDate(target14.getDate() + DAYS_BEFORE_14);
  const targetDate14 = target14.toISOString().slice(0, 10);

  // Window for 2-day reminders: today → today + 2
  const target2 = new Date();
  target2.setDate(target2.getDate() + DAYS_BEFORE_2);
  const targetDate2 = target2.toISOString().slice(0, 10);

  // 1a. Reminders for 14-day SMS (not yet sent)
  const { data: reminders14, error: remErr14 } = await db
    .from('reminders')
    .select('id, pet_id, name, protocol_name, due_date')
    .gte('due_date', today)
    .lte('due_date', targetDate14)
    .is('sms_sent_at', null);

  if (remErr14) {
    return NextResponse.json({ error: remErr14.message }, { status: 500 });
  }

  // 1b. Reminders for 2-day SMS (not yet sent)
  const { data: reminders2, error: remErr2 } = await db
    .from('reminders')
    .select('id, pet_id, name, protocol_name, due_date')
    .gte('due_date', today)
    .lte('due_date', targetDate2)
    .is('sms_sent_2d_at', null);

  if (remErr2) {
    return NextResponse.json({ error: remErr2.message }, { status: 500 });
  }

  // Merge all reminders that need processing (deduplicate by id + type)
  type ReminderRow = { id: number; pet_id: number; name: string | null; protocol_name: string | null; due_date: string };
  type ReminderTask = { reminder: ReminderRow; type: '14d' | '2d' };

  const tasks: ReminderTask[] = [
    ...(reminders14 ?? []).map(r => ({ reminder: r as ReminderRow, type: '14d' as const })),
    ...(reminders2 ?? []).map(r => ({ reminder: r as ReminderRow, type: '2d' as const })),
  ];

  if (tasks.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No reminders due' });
  }

  // 2. Get all unique pets
  const petIds = [...new Set(tasks.map(t => t.reminder.pet_id))];
  const { data: pets, error: petsErr } = await db
    .from('pets')
    .select('id, client_id, nickname')
    .in('id', petIds);

  if (petsErr) {
    return NextResponse.json({ error: petsErr.message }, { status: 500 });
  }

  // 3. Get all unique clients
  const clientIds = [...new Set((pets ?? []).map(p => p.client_id))];
  const { data: clients, error: clientsErr } = await db
    .from('clients')
    .select('id, first_name, last_name, phone')
    .in('id', clientIds);

  if (clientsErr) {
    return NextResponse.json({ error: clientsErr.message }, { status: 500 });
  }

  // Build lookup maps
  const petMap = new Map((pets ?? []).map(p => [p.id, p]));
  const clientMap = new Map((clients ?? []).map(c => [c.id, c]));

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

  // 4. Send SMS for each task
  const results: { reminder_id: number; type: string; phone: string; ok: boolean; error?: string }[] = [];

  for (const { reminder, type } of tasks) {
    const pet = petMap.get(reminder.pet_id);
    if (!pet) continue;

    const client = clientMap.get(pet.client_id);
    if (!client?.phone) continue;

    // Normalize to E.164: 07xx → +407xx, strip spaces/dashes
    let phone = client.phone.replace(/[\s\-().]/g, '');
    if (!phone) continue;
    if (phone.startsWith('07') || phone.startsWith('02') || phone.startsWith('03')) {
      phone = '+4' + phone;
    } else if (phone.startsWith('4') && !phone.startsWith('+')) {
      phone = '+' + phone;
    }

    const firstName = capitalize(client.first_name);
    const petName = capitalize(pet.nickname ?? 'animalul dumneavoastra');
    const reminderName = reminder.name ?? reminder.protocol_name ?? 'tratament';
    const dueFormatted = formatDate(reminder.due_date);

    const body =
      `Stimate/a ${firstName}, va informam ca ${petName} are programata procedura "${reminderName}" ` +
      `scadenta pe data de ${dueFormatted}. ` +
      `Va asteptam la Canis Vet pentru programare. ` +
      `Tel: 0745 534 944`;

    const result = await sendSms(phone, body);
    if (result.ok) {
      const updateField = type === '14d' ? 'sms_sent_at' : 'sms_sent_2d_at';
      await db.from('reminders').update({ [updateField]: new Date().toISOString() }).eq('id', reminder.id);
    }
    results.push({ reminder_id: reminder.id, type, phone, ...result });
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);

  return NextResponse.json({ sent, failed, total: results.length });
}
