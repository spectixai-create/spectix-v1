import { VersionFooter } from '@/components/layout/version-footer';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col">{children}</div>
      <VersionFooter className="mt-auto" />
    </div>
  );
}
