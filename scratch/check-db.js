const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
    env[match[1]] = value.trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkDb() {
  console.log('Testing Supabase Client Connection...');
  // Test profiles table structure
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (pErr) {
    console.error('Error fetching profiles:', pErr);
  } else {
    console.log('Successfully fetched profile sample:', profile);
    if (profile && profile.length > 0) {
      console.log('Columns in profiles:', Object.keys(profile[0]));
    }
  }

  // Test if atom_transactions table exists
  const { data: tx, error: txErr } = await supabase
    .from('atom_transactions')
    .select('*')
    .limit(1);

  if (txErr) {
    console.error('atom_transactions table test failed (likely does not exist):', txErr.message);
  } else {
    console.log('atom_transactions table exists! Sample:', tx);
  }
}

checkDb();
