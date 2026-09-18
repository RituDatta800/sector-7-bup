import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'GridWise — Smart Campus Energy Optimization',
  description:
    'Plan a 24-hour campus energy schedule: natural-language operator notes interpreted into structured directives, guardrailed, and solved for minimum cost.',
  applicationName: 'GridWise',
  authors: [{ name: 'AlgoLink / Algoverse' }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d0d' },
  ],
};

/**
 * globals.css sets `scroll-behavior: smooth`. Since Next 16 the router no longer
 * overrides that during navigation unless `data-scroll-behavior="smooth"` opts
 * in — which keeps route changes instant while in-page scrolling stays smooth.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
