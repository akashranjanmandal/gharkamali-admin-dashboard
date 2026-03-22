import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import AdminProviders from '@/components/AdminProviders';
import { Toaster } from 'react-hot-toast';

const poppins = Poppins({ subsets: ['latin'], weight: ['400','500','600','700','800'], display: 'swap' });

export const metadata: Metadata = { title: 'GKM Admin', description: 'Ghar Ka Mali — Admin Dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.className} suppressHydrationWarning>
      <body>
        <AdminProviders>{children}</AdminProviders>
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontFamily: 'Poppins', fontSize: '0.85rem', borderRadius: '12px' } }} />
      </body>
    </html>
  );
}
