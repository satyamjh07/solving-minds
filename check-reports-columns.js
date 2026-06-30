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
    env[match[1]] = value.trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkColumns() {
  console.log('Testing connection to Supabase...');
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching reports:', error.message);
  } else {
    console.log('Success! Columns in reports table:');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('No rows returned, trying to insert a dummy invalid row to trigger schema mismatch...');
      const { error: insError } = await supabase
        .from('reports')
        .insert({
          reporter_id: '00000000-0000-0000-0000-000000000000',
          question_id: '00000000-0000-0000-0000-000000000000',
          reason: 'test',
          status: 'pending'
        });
      console.log('Insert response error message:', insError ? insError.message : 'No error');
    }
  }
}
checkColumns();
