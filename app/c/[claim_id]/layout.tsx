export default function ClaimantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-950">
      {children}
    </main>
  );
}
