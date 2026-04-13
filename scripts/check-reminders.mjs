import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check columns
const { data: sample } = await db.from('reminders').select('*').limit(1);
console.log('Columns:', Object.keys(sample[0]));

// Distribution by month
const { data: all } = await db.from('reminders').select('due_date').gte('due_date', '2026-01-01').order('due_date');
const counts = {};
all.forEach(r => { const m = r.due_date.slice(0, 7); counts[m] = (counts[m] || 0) + 1; });
console.log('\nReminders by month:');
Object.entries(counts).forEach(([m, c]) => console.log(`  ${m}: ${c}`));
console.log('\nTotal:', all.length);
