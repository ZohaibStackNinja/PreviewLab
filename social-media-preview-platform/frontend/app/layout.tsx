import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Practiscale Preview Lab — Social Media Preview Platform',
  description:
    'See how your designs look inside realistic social-media contexts before publishing. Preview image creatives on YouTube, Instagram, Facebook, TikTok and LinkedIn, share time-limited review links and collect comments.',
  icons: {
    icon: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

import Providers from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
