import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prevu — Social Media Preview Platform',
  description:
    'See how your designs look inside realistic social-media contexts before publishing. Preview image creatives on YouTube, Instagram, Facebook, TikTok and LinkedIn, share time-limited review links and collect comments.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
