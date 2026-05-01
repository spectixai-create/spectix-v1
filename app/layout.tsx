import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spectix Claim Investigator',
  description: 'POC — claim investigation and risk analysis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
