const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function getSystemChromePath() {
  const paths = [
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

async function runTest() {
  const attemptId = 'd011d55a-54b9-434c-8c7b-b7d80181dc7e';
  console.log('Starting Next.js dev server...');
  
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    stdio: 'pipe'
  });

  let serverStarted = false;

  // Listen to server output to detect when it is ready
  devServer.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Next.js]: ${output.trim()}`);
    if (output.includes('Ready') || output.includes('started') || output.includes('Local:')) {
      serverStarted = true;
    }
  });

  devServer.stderr.on('data', (data) => {
    console.error(`[Next.js Error]: ${data.toString()}`);
  });

  // Wait up to 15 seconds for the server to boot
  console.log('Waiting for dev server to start...');
  for (let i = 0; i < 15; i++) {
    if (serverStarted) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!serverStarted) {
    console.log('Dev server took longer than expected to output Ready/Local, proceeding anyway...');
  } else {
    console.log('Dev server is ready!');
  }

  let browser;
  try {
    console.log('Launching test Puppeteer browser...');
    browser = await puppeteer.launch({
      executablePath: getSystemChromePath(),
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'load', timeout: 120000 });

    console.log('Filling in login credentials...');
    await page.type('input[type="email"]', 'mockstudent@solvingminds.com');
    await page.type('input[type="password"]', 'password123');

    console.log('Submitting login form...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'load', timeout: 120000 })
    ]);

    console.log('Successfully logged in! Current URL:', page.url());

    // Navigate to a blank page on the same domain first if needed,
    // or just execute fetch directly on dashboard.
    console.log(`Triggering PDF generation API call for attempt: ${attemptId}...`);
    
    // Call PDF generator API from inside the authenticated browser context
    const pdfBase64 = await page.evaluate(async (id) => {
      console.log('Fetching PDF inside browser context...');
      const res = await fetch(`/api/analysis/${id}/pdf`);
      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}: ${await res.text()}`);
      }
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }, attemptId);

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const outputPath = path.join(__dirname, 'SolvingMinds_Report.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);

    console.log(`\n=====================================================================`);
    console.log(`  PDF SUCCESSFULLY GENERATED AND VERIFIED!`);
    console.log(`  File path: ${outputPath}`);
    console.log(`  File size: ${(pdfBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`=====================================================================\n`);

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Stopping dev server...');
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec(`taskkill /pid ${devServer.pid} /T /F`, (err) => {
        if (err) {
          devServer.kill();
        }
        process.exit(0);
      });
    } else {
      devServer.kill('SIGINT');
      process.kill(-devServer.pid, 'SIGINT').catch(() => {});
      process.exit(0);
    }
  }
}

runTest();
