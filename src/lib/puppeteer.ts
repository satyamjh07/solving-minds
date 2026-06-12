import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function launchBrowser() {
  const isLocal = process.env.NODE_ENV === 'development';

  if (isLocal) {
    // Dynamically require regular puppeteer locally to run with local Chrome binary
    const puppeteerLocal = require('puppeteer');
    return await puppeteerLocal.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } else {
    // Production / Vercel deployment: launch with sparticuz compressed chromium
    return await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless as boolean | 'shell' | undefined,
    });
  }
}
