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

const { data: reminders } = await db.from('reminders').select('id, pet_id, name, protocol_name, due_date').gte('due_date', today).order('due_date');
const petIds = [...new Set(reminders.map(r => r.pet_id))];
const { data: pets } = await db.from('pets').select('id, client_id, nickname').in('id', petIds);
const petMap = new Map(pets.map(p => [p.id, p]));
const clientIds = [...new Set(pets.map(p => p.client_id))];
const { data: clients } = await db.from('clients').select('id, first_name, last_name, phone').in('id', clientIds);
const clientMap = new Map(clients.map(c => [c.id, c]));

console.log('Nr. | Due Date   | Client               | Animal | Procedura');
console.log('----+------------+----------------------+--------+----------');
reminders.forEach((r, i) => {
  const pet = petMap.get(r.pet_id);
  const client = pet ? clientMap.get(pet.client_id) : null;
  const name = client ? `${client.first_name} ${client.last_name}` : '?';
  const animal = pet?.nickname ?? '?';
  const proc = r.name ?? r.protocol_name ?? '?';
  console.log(`${String(i+1).padStart(3)} | ${r.due_date} | ${name.padEnd(20)} | ${animal.padEnd(6)} | ${proc}`);
});
