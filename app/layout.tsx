import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Platforma clinica',
  description: 'Platforma SaaS pentru clinici veterinare',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
