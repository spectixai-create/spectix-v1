'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, Home, LayoutDashboard, LogOut, Menu } from 'lucide-react';

import { signOut } from '@/lib/auth/actions';
import { getUserInitials } from '@/lib/ui/user-identity';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const navItems = [
  { href: '/overview', label: 'דשבורד', icon: Home },
  { href: '/dashboard', label: 'תור עבודה', icon: LayoutDashboard },
  { href: '/questions', label: 'תור שאלות', icon: HelpCircle },
];

export function AdjusterShellClient({
  children,
  className,
  userEmail,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  userEmail: string | null;
}>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex max-w-screen-xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="shrink-0 font-semibold" prefetch={false}>
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
          <div className="flex items-center gap-2">
            {userEmail ? <UserMenu email={userEmail} /> : null}
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
                        isActivePath(pathname, item.href)
                          ? 'secondary'
                          : 'ghost'
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

function UserMenu({ email }: Readonly<{ email: string }>) {
  const initials = getUserInitials(email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border bg-background font-latin text-sm font-semibold"
          aria-label="תפריט משתמש"
          title="תפריט משתמש"
        >
          <span aria-hidden="true">{initials}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          התנתק
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
