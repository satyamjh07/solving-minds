const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('questions').select('*').limit(5);
  if (error) {
    console.error('Error fetching questions:', error.message);
  } else {
    data.forEach((q, idx) => {
      console.log(`Question ${idx + 1}:`);
      console.log(`- ID: ${q.id}`);
      console.log(`- Type: ${q.type}`);
      console.log(`- Options Type: ${typeof q.options}`);
      console.log(`- Options:`, JSON.stringify(q.options, null, 2));
    });
  }
}

run();
