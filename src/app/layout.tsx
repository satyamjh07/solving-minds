import type { Metadata } from 'next';
import { Bebas_Neue, Space_Grotesk, DM_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { DialogProvider } from '@/components/DialogProvider';
import Script from 'next/script';

const bebasNeue = Bebas_Neue({
  weight: '400',
  variable: '--font-bebas',
  subsets: ['latin'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

const dmMono = DM_Mono({
  weight: ['400', '500'],
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Solving Minds',
  description: 'Next-gen study environment for JEE / NEET aspirants. Track progress, solve PYQs, and connect with your community.',
  keywords: ['JEE', 'NEET', 'study', 'PYQ', 'test series', 'community', 'Solving Minds'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${spaceGrotesk.variable} ${dmMono.variable}`}>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="stylesheet" href="/css/themes.css" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/cloudinary-styles.css" />
        <link rel="stylesheet" href="/css/leaderboard.css" />
        <link rel="stylesheet" href="/css/zeroday-theme.css" />
        <link rel="stylesheet" href="/css/my-posts.css" />
        <link rel="stylesheet" href="/css/admin-form-redesign.css" />
        <link rel="stylesheet" href="/css/solver.css" />
        <link rel="stylesheet" href="/css/bottom-nav-patch.css" />
        <link rel="stylesheet" href="/css/dashboard-analytics.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
        <Script 
          src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" 
          strategy="beforeInteractive" 
        />
        <Script 
          src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)] antialiased font-[family-name:var(--font-grotesk)]">
        <ThemeProvider>
          <DialogProvider>
            {children}
          </DialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
