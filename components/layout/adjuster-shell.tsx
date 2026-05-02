'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, HelpCircle, LayoutDashboard, Menu } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const navItems = [
  { href: '/dashboard', label: 'תור עבודה', icon: LayoutDashboard },
  { href: '/questions', label: 'תור שאלות', icon: HelpCircle },
  { href: '/design-system', label: 'Design system', icon: FileText },
];

export function AdjusterShell({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-semibold" prefetch={false}>
            Spectix
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant={
                  isActivePath(pathname, item.href) ? 'secondary' : 'ghost'
                }
                size="sm"
              >
                <Link href={item.href} className="gap-2" prefetch={false}>
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="פתיחת ניווט"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="end">
              <SheetHeader>
                <SheetTitle>Spectix</SheetTitle>
                <SheetDescription>ניווט מערכת</SheetDescription>
              </SheetHeader>
              <nav className="mt-6 grid gap-2">
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    asChild
                    variant={
                      isActivePath(pathname, item.href) ? 'secondary' : 'ghost'
                    }
                    className="justify-start gap-2"
                  >
                    <Link href={item.href} prefetch={false}>
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main
        className={cn('container mx-auto max-w-screen-xl px-4 py-6', className)}
      >
        {children}
      </main>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
