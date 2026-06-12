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

async function generateMockAttempt() {
  const testId = 'pyp-jee-main-2026-04-april-shift-1';
  const email = 'mockstudent@solvingminds.com';
  const password = 'password123';

  console.log(`Authenticating test user: ${email}...`);
  let userId;
  
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInErr) {
    console.log('User not found or sign in failed. Attempting to register new user...');
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: 'Mock Student'
        }
      }
    });

    if (signUpErr) {
      console.error('Registration failed:', signUpErr);
      return;
    }
    
    if (signUpData.user) {
      userId = signUpData.user.id;
      console.log(`Registered new user! ID: ${userId}`);
    } else {
      console.error('Sign up completed but no user returned (requires email confirmation?)');
      return;
    }
  } else {
    userId = signInData.user.id;
    console.log(`Logged in successfully! ID: ${userId}`);
  }

  console.log(`Fetching questions for test: ${testId}...`);
  // 1. Fetch test details
  const { data: testData, error: testErr } = await supabase
    .from('mock_tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (testErr || !testData) {
    console.error('Failed to fetch test:', testErr);
    return;
  }

  // 2. Fetch questions
  let qQuery = supabase.from('questions').select('*');
  if (testData.is_pyp && testData.year && testData.shift) {
    qQuery = qQuery.eq('year', testData.year).eq('shift', testData.shift);
  } else {
    qQuery = qQuery.eq('booklet_id', testId);
  }

  const { data: questions, error: qErr } = await qQuery;
  if (qErr || !questions || questions.length === 0) {
    console.error('Failed to fetch questions:', qErr);
    return;
  }

  console.log(`Found ${questions.length} questions. Creating new uncompleted attempt record...`);

  // Step 1: Insert fresh incomplete attempt (comply with RLS insert policies)
  const { data: attemptRecord, error: insertErr } = await supabase
    .from('mock_test_live_attempts')
    .insert({
      test_id: testId,
      user_id: userId,
      answers: {},
      statuses: {},
      question_durations: {},
      time_left: testData.duration * 60,
      completed: false
    })
    .select('id')
    .single();

  if (insertErr || !attemptRecord) {
    console.error('Error creating initial attempt:', insertErr);
    return;
  }

  const attemptId = attemptRecord.id;
  console.log(`Created initial attempt! ID: ${attemptId}. Populating answers...`);

  const answers = {};
  const statuses = {};
  const questionDurations = {};

  questions.forEach((q, index) => {
    const isMcq = q.type !== 'integer';
    
    // Categorize questions:
    // - Index 0-44: Correct answers (45 questions)
    // - Index 45-59: Incorrect answers (15 questions)
    // - Index 60-74: Skipped (15 questions)
    
    if (index < 45) {
      answers[q.id] = q.correct_answer;
      statuses[q.id] = Math.random() > 0.15 ? 'answered' : 'answered-marked';
      
      const recommended = q.difficulty === 'easy' ? 90 : q.difficulty === 'medium' ? 120 : 180;
      if (index % 5 === 0) {
        questionDurations[q.id] = Math.round(recommended * 1.6 + Math.random() * 40);
      } else {
        questionDurations[q.id] = Math.round(recommended * 0.7 + Math.random() * recommended * 0.2);
      }
    } else if (index < 60) {
      let wrongAns = 'A';
      if (isMcq) {
        const options = ['A', 'B', 'C', 'D'];
        const correctIdx = options.indexOf(q.correct_answer.trim());
        const wrongIdx = (correctIdx + 1) % 4;
        wrongAns = options[wrongIdx];
      } else {
        wrongAns = String(parseInt(q.correct_answer) + 1 || 5);
      }
      answers[q.id] = wrongAns;
      statuses[q.id] = 'answered';

      const recommended = q.difficulty === 'easy' ? 90 : q.difficulty === 'medium' ? 120 : 180;
      if (index % 3 === 0) {
        questionDurations[q.id] = Math.round(10 + Math.random() * 15);
      } else if (index % 3 === 1) {
        questionDurations[q.id] = Math.round(recommended * 1.7 + Math.random() * 50);
      } else {
        questionDurations[q.id] = Math.round(recommended * 0.8);
      }
    } else {
      answers[q.id] = null;
      statuses[q.id] = Math.random() > 0.5 ? 'not-visited' : 'marked';
      
      if (index % 3 === 0) {
        questionDurations[q.id] = Math.round(55 + Math.random() * 40);
      } else {
        questionDurations[q.id] = Math.round(5 + Math.random() * 15);
      }
    }
  });

  const totalTimeSpent = Object.values(questionDurations).reduce((acc, curr) => acc + curr, 0);
  console.log(`Total generated duration: ${totalTimeSpent} seconds (${Math.round(totalTimeSpent / 60)} minutes)`);

  // Step 2: Update attempt to completed with data (comply with RLS update policies)
  const { data: updatedAttempt, error: updateErr } = await supabase
    .from('mock_test_live_attempts')
    .update({
      answers: answers,
      statuses: statuses,
      question_durations: questionDurations,
      time_left: Math.max(0, testData.duration * 60 - totalTimeSpent),
      completed: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', attemptId)
    .select('id')
    .single();

  if (updateErr) {
    console.error('Error updating attempt details:', updateErr);
  } else {
    console.log(`Successfully completed and populated attempt! ID: ${attemptId}`);
    console.log(`\n=====================================================================`);
    console.log(`  Use this login to view in browser:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  URL: http://localhost:3000/analysis/${attemptId}`);
    console.log(`=====================================================================\n`);
  }
}

generateMockAttempt();
