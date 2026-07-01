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

async function checkPolicies() {
  console.log('Querying policies...');
  // Query pg_policies if public has read access. Usually, catalog tables are readable.
  const { data, error } = await supabase.rpc('inspect_policies_helper');
  if (error) {
    console.log('RPC failed:', error.message);
    // Let's try direct select from pg_policies.
    const { data: pData, error: pError } = await supabase
      .from('pg_policies')
      .select('*');
    if (pError) {
      console.log('Direct policies select failed:', pError.message);
    } else {
      console.log('Policies data:', pData);
    }
  } else {
    console.log('Policies details:', data);
  }
}

checkPolicies();
