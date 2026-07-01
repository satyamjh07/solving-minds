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

async function checkSchema() {
  console.log('Fetching single row from posts...');
  const { data: posts, error: pError } = await supabase.from('posts').select('*').limit(1);
  if (pError) console.error('posts error:', pError);
  else console.log('posts columns:', posts.length > 0 ? Object.keys(posts[0]) : 'empty table');

  console.log('Fetching single row from profiles...');
  const { data: profiles, error: prError } = await supabase.from('profiles').select('*').limit(1);
  if (prError) console.error('profiles error:', prError);
  else console.log('profiles columns:', profiles.length > 0 ? Object.keys(profiles[0]) : 'empty table');

  console.log('Fetching single row from reports...');
  const { data: reports, error: rError } = await supabase.from('reports').select('*').limit(1);
  if (rError) console.error('reports error:', rError);
  else console.log('reports columns:', reports.length > 0 ? Object.keys(reports[0]) : 'empty table');
}

checkSchema();
