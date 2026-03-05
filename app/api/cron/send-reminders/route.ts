import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID!;
const CRON_SECRET = process.env.CRON_SECRET!;

const DAYS_BEFORE = 14;

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
      Body: body,
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

  // Target date: today + DAYS_BEFORE
  const target = new Date();
  target.setDate(target.getDate() + DAYS_BEFORE);
  const targetDate = target.toISOString().slice(0, 10); // YYYY-MM-DD

  // 1. Get reminders due on target date
  const { data: reminders, error: remErr } = await db
    .from('reminders')
    .select('id, pet_id, name, protocol_name, due_date')
    .eq('due_date', targetDate);

  if (remErr) {
    return NextResponse.json({ error: remErr.message }, { status: 500 });
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No reminders due' });
  }

  // 2. Get pets for those pet_ids
  const petIds = [...new Set(reminders.map(r => r.pet_id))];
  const { data: pets, error: petsErr } = await db
    .from('pets')
    .select('id, client_id, nickname')
    .in('id', petIds);

  if (petsErr) {
    return NextResponse.json({ error: petsErr.message }, { status: 500 });
  }

  // 3. Get clients for those client_ids
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

  // 4. Send SMS for each reminder
  const results: { reminder_id: number; phone: string; ok: boolean; error?: string }[] = [];

  for (const reminder of reminders) {
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

    const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
    const firstName = capitalize(client.first_name);
    const petName = capitalize(pet.nickname ?? 'animalul dumneavoastra');
    const reminderName = reminder.name ?? reminder.protocol_name ?? 'tratament';
    const dueFormatted = formatDate(reminder.due_date);

    const body =
      `Stimate/a ${firstName}, va informam ca ${petName} are programata procedura "${reminderName}" ` +
      `scadenta pe data de ${dueFormatted}. ` +
      `Va asteptam la Canis Vet pentru programare. ` +
      `Tel: 0752 823 794`;

    const result = await sendSms(phone, body);
    results.push({ reminder_id: reminder.id, phone, ...result });
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);

  return NextResponse.json({ sent, failed, total: results.length });
}
