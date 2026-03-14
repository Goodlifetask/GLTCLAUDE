import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import '../styles/globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['400', '600', '700', '900'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default:  'GoodLifeTask — Reminder & Productivity App',
    template: '%s | GoodLifeTask',
  },
  description: 'Stay on top of tasks, calls, emails, and recurring events with GoodLifeTask.',
  applicationName: 'GoodLifeTask',
  keywords: ['reminders', 'productivity', 'task manager', 'calendar'],
  authors: [{ name: 'GoodLifeTask' }],
  creator: 'GoodLifeTask',
  openGraph: {
    type:        'website',
    siteName:    'GoodLifeTask',
    title:       'GoodLifeTask — Reminder & Productivity App',
    description: 'Your personal reminder and productivity companion.',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  icons: {
    icon:  [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width:          'device-width',
  initialScale:   1,
  themeColor:     [
    { media: '(prefers-color-scheme: light)', color: '#F0A202' },
    { media: '(prefers-color-scheme: dark)',  color: '#202C59' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <head />
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
