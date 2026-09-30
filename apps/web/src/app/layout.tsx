import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { THEME_BOOTSTRAP } from '@/lib/theme';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'People & ER Platform', template: '%s · People & ER Platform' },
  description: 'BML People & ER Platform – internal HR platform (DEV, synthetic data).',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f4f6f9' }, { media: '(prefers-color-scheme: dark)', color: '#0a1628' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by the bootstrap script before paint; suppress the expected attribute difference.
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
