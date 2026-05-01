export default function AdjusterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-screen-xl px-4 py-4">
          <p className="font-semibold">Spectix - מערכת ניהול תביעות</p>
        </div>
      </header>
      {children}
    </div>
  );
}
