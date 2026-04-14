import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const today = new Date().toISOString().slice(0, 10);

// All reminders from today onwards
const { data: reminders } = await db.from('reminders').select('id, pet_id, due_date').gte('due_date', today).order('due_date');
console.log(`Reminders due >= today (${today}): ${reminders.length}`);

const petIds = [...new Set(reminders.map(r => r.pet_id))];
const { data: pets } = await db.from('pets').select('id, client_id').in('id', petIds);
const petMap = new Map(pets.map(p => [p.id, p]));

const clientIds = [...new Set(pets.map(p => p.client_id))];
const { data: clients } = await db.from('clients').select('id, phone').in('id', clientIds);
const clientMap = new Map(clients.map(c => [c.id, c]));

let withPhone = 0, withoutPhone = 0;
for (const r of reminders) {
  const pet = petMap.get(r.pet_id);
  if (!pet) { withoutPhone++; continue; }
  const client = clientMap.get(pet.client_id);
  if (client?.phone?.trim()) withPhone++;
  else withoutPhone++;
}

console.log(`  Cu telefon (se trimit SMS): ${withPhone}`);
console.log(`  Fără telefon (se sar):      ${withoutPhone}`);
