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

async function inspectSchema() {
  console.log('Fetching sample from mock_tests...');
  const { data: testData, error: testError } = await supabase.from('mock_tests').select('*').limit(1);
  if (testError) console.error('mock_tests error:', testError);
  else console.log('mock_tests keys:', testData.length > 0 ? Object.keys(testData[0]) : 'empty');

  console.log('Fetching sample from questions...');
  const { data: qData, error: qError } = await supabase.from('questions').select('*').limit(1);
  if (qError) console.error('questions error:', qError);
  else console.log('questions keys:', qData.length > 0 ? Object.keys(qData[0]) : 'empty');

  console.log('Fetching sample from mock_test_live_attempts...');
  const { data: attemptData, error: attemptError } = await supabase.from('mock_test_live_attempts').select('*').limit(1);
  if (attemptError) console.error('mock_test_live_attempts error:', attemptError);
  else console.log('mock_test_live_attempts keys:', attemptData.length > 0 ? Object.keys(attemptData[0]) : 'empty');
}

inspectSchema();
