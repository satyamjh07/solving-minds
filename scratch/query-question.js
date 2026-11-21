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
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .ilike('question_text', '%multicolumn%');
    
  if (error) {
    console.error('Error fetching questions:', error.message);
  } else {
    console.log(`Found ${data.length} questions:`);
    data.forEach((q, idx) => {
      console.log(`Question ${idx + 1}:`);
      console.log(`- ID: ${q.id}`);
      console.log(`- Text:\n${q.question_text}`);
    });
  }
}

run();
