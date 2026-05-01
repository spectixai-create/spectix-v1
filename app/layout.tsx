import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { heebo, inter } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spectix',
  description: 'מערכת ניהול וחקירת תביעות ביטוח נסיעות',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
