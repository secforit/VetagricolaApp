import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const _inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CanisVet - Veterinary Management',
  description: 'Professional veterinary clinic management dashboard for Cabinet Veterinar Arad',
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
