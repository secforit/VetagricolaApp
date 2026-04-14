import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializeForJson } from '@/lib/prismaTables';

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
  const date = new Date(dateStr);
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function capitalize(value: string | null): string {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || CRON_SECRET.length < 16) {
    console.error('[cron] CRON_SECRET is missing or too short');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const target14 = new Date();
  target14.setDate(target14.getDate() + DAYS_BEFORE_14);
  const targetDate14 = target14.toISOString().slice(0, 10);

  const target2 = new Date();
  target2.setDate(target2.getDate() + DAYS_BEFORE_2);
  const targetDate2 = target2.toISOString().slice(0, 10);

  const [reminders14, reminders2] = await Promise.all([
    prisma.reminder.findMany({
      where: {
        due_date: {
          gte: today,
          lte: targetDate14,
        },
        sms_sent_at: null,
      },
      select: {
        id: true,
        pet_id: true,
        name: true,
        protocol_name: true,
        due_date: true,
      },
    }),
    prisma.reminder.findMany({
      where: {
        due_date: {
          gte: today,
          lte: targetDate2,
        },
        sms_sent_2d_at: null,
      },
      select: {
        id: true,
        pet_id: true,
        name: true,
        protocol_name: true,
        due_date: true,
      },
    }),
  ]);

  type ReminderTask = {
    reminder: (typeof reminders14)[number];
    type: '14d' | '2d';
  };

  const tasks: ReminderTask[] = [
    ...reminders14.map((reminder) => ({ reminder, type: '14d' as const })),
    ...reminders2.map((reminder) => ({ reminder, type: '2d' as const })),
  ];

  if (tasks.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No reminders due' });
  }

  const petIds = [...new Set(tasks.map((task) => task.reminder.pet_id).filter((id): id is bigint => id !== null))];
  const pets = petIds.length
    ? await prisma.pet.findMany({
        where: {
          id: { in: petIds },
        },
        select: {
          id: true,
          client_id: true,
          nickname: true,
        },
      })
    : [];

  const clientIds = [
    ...new Set(pets.map((pet) => pet.client_id).filter((id): id is bigint => id !== null)),
  ];
  const clients = clientIds.length
    ? await prisma.client.findMany({
        where: {
          id: { in: clientIds },
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          phone: true,
        },
      })
    : [];

  const petMap = new Map(pets.map((pet) => [pet.id, pet]));
  const clientMap = new Map(clients.map((client) => [client.id, client]));

  const results: { reminder_id: bigint; type: '14d' | '2d'; ok: boolean; error?: string }[] = [];

  for (const { reminder, type } of tasks) {
    if (reminder.pet_id === null) {
      continue;
    }

    const pet = petMap.get(reminder.pet_id);
    if (!pet || pet.client_id === null) {
      continue;
    }

    const client = clientMap.get(pet.client_id);
    if (!client?.phone) {
      continue;
    }

    let phone = client.phone.replace(/[\s\-().]/g, '');
    if (!phone) {
      continue;
    }

    if (phone.startsWith('07') || phone.startsWith('02') || phone.startsWith('03')) {
      phone = `+4${phone}`;
    } else if (phone.startsWith('4') && !phone.startsWith('+')) {
      phone = `+${phone}`;
    }

    const firstName = capitalize(client.first_name);
    const petName = capitalize(pet.nickname ?? 'animalul dumneavoastra');
    const reminderName = reminder.name ?? reminder.protocol_name ?? 'tratament';
    const dueFormatted = formatDate(reminder.due_date ?? today);

    const body =
      `Stimate/a ${firstName}, va informam ca ${petName} are programata procedura "${reminderName}" ` +
      `scadenta pe data de ${dueFormatted}. ` +
      'Va asteptam la Canis Vet pentru programare. ' +
      'Tel: 0745 534 944';

    const result = await sendSms(phone, body);
    if (result.ok) {
      const data =
        type === '14d'
          ? {
              sms_sent_at: new Date(),
            }
          : {
              sms_sent_2d_at: new Date(),
            };

      await prisma.reminder.update({
        where: {
          id: reminder.id,
        },
        data,
      });
    }

    results.push({
      reminder_id: reminder.id,
      type,
      ...result,
    });
  }

  const sent = results.filter((entry) => entry.ok).length;
  const failed = results.filter((entry) => !entry.ok);

  return NextResponse.json({
    sent,
    failed: serializeForJson(failed),
    total: results.length,
  });
}
