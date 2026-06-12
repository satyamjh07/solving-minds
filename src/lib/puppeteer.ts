import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';

function getSystemChromePath(): string | undefined {
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

export async function launchBrowser() {
  const isLocal = process.env.NODE_ENV === 'development';

  if (isLocal) {
    // Dynamically require regular puppeteer locally to run with local Chrome binary
    const puppeteerLocal = require('puppeteer');
    const systemPath = getSystemChromePath();
    return await puppeteerLocal.launch({
      executablePath: systemPath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } else {
    // Production / Vercel deployment: launch with sparticuz compressed chromium
    const execPath = await chromium.executablePath();
    if (execPath) {
      const dir = path.dirname(execPath);
      process.env.LD_LIBRARY_PATH = dir + (process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : '');
    }

    return await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless as boolean | 'shell' | undefined,
    });
  }
}
