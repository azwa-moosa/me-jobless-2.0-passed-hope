import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'People & ER Platform', template: '%s · People & ER Platform' },
  description: 'BML People & ER Platform – internal HR platform (DEV, synthetic data).',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
