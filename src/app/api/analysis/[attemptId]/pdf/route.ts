import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { launchBrowser } from '@/lib/puppeteer';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ attemptId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { attemptId } = await params;
  const urlObj = new URL(req.url);
  const host = urlObj.host;
  const protocol = urlObj.protocol;
  const printUrl = `${protocol}//${host}/analysis/${attemptId}/print`;

  let browser;
  try {
    console.log(`PDF Generator: Launching browser for attempt: ${attemptId}...`);
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Set A4 viewport for clean printing
    await page.setViewport({
      width: 800,
      height: 1130,
      deviceScaleFactor: 2,
    });

    // Forward auth session cookies to Puppeteer browser
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    if (allCookies && allCookies.length > 0) {
      const puppeteerCookies = allCookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: urlObj.hostname,
        path: '/',
        secure: protocol === 'https:',
        httpOnly: true,
      }));
      await page.setCookie(...puppeteerCookies);
    }

    console.log(`PDF Generator: Navigating to print view: ${printUrl}`);
    // Go to the print-optimized route
    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for the charts to finish mounting and rendering SVGs
    console.log('PDF Generator: Waiting for charts to load...');
    await page.waitForSelector('.recharts-responsive-container', { timeout: 15000 });
    
    // Add brief delay for smooth transition and rendering
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('PDF Generator: Printing page to PDF stream...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm', // margins are handled inside our print-page containers for absolute A4 grid control
        bottom: '0mm',
        left: '0mm',
        right: '0mm'
      }
    });

    console.log('PDF Generator: Successfully generated PDF report.');
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SolvingMinds_Report_${attemptId}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      }
    });

  } catch (err: any) {
    console.error('PDF Generator Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate PDF report.', details: err.message },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
