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

async function inspectConstraint() {
  const { data, error } = await supabase.rpc('inspect_constraint_helper');
  if (error) {
    console.log('RPC failed:', error.message);
    // If RPC doesn't exist, let's run a select query on pg_constraint if public has permissions,
    // though usually Postgrest restricts direct access to catalog.
    // Let's try select from pg_catalog.
    const { data: catData, error: catError } = await supabase
      .from('pg_constraint')
      .select('*');
    if (catError) {
      console.log('Direct catalog select failed:', catError.message);
    } else {
      console.log('Catalog data:', catData);
    }
  } else {
    console.log('Constraint details:', data);
  }
}
inspectConstraint();
