import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map((p, i) => i === 0 ? p.trim() : l.slice(l.indexOf('=') + 1).trim()))
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const REMINDER_ID = 16840288;

const { data: reminder, error: remErr } = await db
  .from('reminders')
  .select('id, pet_id, name, protocol_name, due_date')
  .eq('id', REMINDER_ID)
  .single();

if (remErr || !reminder) { console.error('Reminder not found:', remErr); process.exit(1); }
console.log('Reminder:', reminder);

const { data: pet } = await db.from('pets').select('id, client_id, nickname').eq('id', reminder.pet_id).single();
if (!pet) { console.error('Pet not found'); process.exit(1); }
console.log('Pet:', pet);

const { data: client } = await db.from('clients').select('id, first_name, last_name, phone').eq('id', pet.client_id).single();
if (!client?.phone) { console.error('Client or phone not found'); process.exit(1); }
console.log('Client:', client);

let phone = client.phone.replace(/[\s\-().]/g, '');
if (phone.startsWith('07') || phone.startsWith('02') || phone.startsWith('03')) phone = '+4' + phone;
else if (phone.startsWith('4') && !phone.startsWith('+')) phone = '+' + phone;

const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
const firstName = capitalize(client.first_name);
const petName = capitalize(pet.nickname ?? 'animalul dumneavoastra');
const reminderName = reminder.name ?? reminder.protocol_name ?? 'tratament';
const d = new Date(reminder.due_date);
const dueFormatted = d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });

const body =
  `Stimate/a ${firstName}, va informam ca ${petName} are programata procedura "${reminderName}" ` +
  `scadenta pe data de ${dueFormatted}. ` +
  `Va asteptam la Canis Vet pentru programare. ` +
  `Tel: 0745 534 944`;

console.log('\nPhone:', phone);
console.log('Message:', body);

const res = await fetch('https://app.smso.ro/api/v1/send', {
  method: 'POST',
  headers: { 'X-Authorization': env.SMSO_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: phone, sender: Number(env.SMSO_SENDER), body, type: 'transactional', remove_special_chars: 1 }),
});

const result = await res.json();
console.log('\nSMSO response:', result);
