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
  // Inspect questions table columns
  const { data: qData, error: qErr } = await supabase.from('questions').select('*').limit(1);
  if (qErr) {
    console.error('Error fetching questions:', qErr.message);
  } else if (qData && qData.length > 0) {
    console.log('Questions table columns:', Object.keys(qData[0]));
    console.log('Sample question difficulty:', qData[0].difficulty);
  }

  // Inspect question_stats or similar tables if they exist
  const { data: testStats, error: statsErr } = await supabase.from('question_stats').select('*').limit(1);
  if (statsErr) {
    console.log('question_stats select failed:', statsErr.message);
  } else {
    console.log('question_stats table columns:', testStats.length > 0 ? Object.keys(testStats[0]) : 'Empty table');
  }
}

run();
