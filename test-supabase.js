const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');
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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testInsert() {
  const payload = {
    title: 'Test Booklet From Node',
    description: 'Testing if subject and target_year columns exist',
    subject: 'physics',
    target_year: 2025
  };

  const { data, error } = await supabase.from('booklets').insert([payload]).select();
  if (error) {
    console.log('Insert failed:', error.message);
  } else {
    console.log('Insert succeeded! Created row:', data);
    // clean up
    await supabase.from('booklets').delete().eq('id', data[0].id);
  }
}
testInsert();
