const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkAttempts() {
  const { data, error, count } = await supabase
    .from('mock_test_live_attempts')
    .select('id, test_id, completed, user_id', { count: 'exact' });
  if (error) {
    console.error(error);
  } else {
    console.log('Total attempts:', count);
    console.log('First 5 attempts:', data.slice(0, 5));
  }
}

checkAttempts();
