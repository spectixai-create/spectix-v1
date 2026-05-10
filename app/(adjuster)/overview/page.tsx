import Link from 'next/link';
import { ClipboardList, HelpCircle, PlusCircle } from 'lucide-react';

import { fetchClaimsList } from '@/lib/adjuster/data';
import { requireUser } from '@/lib/auth/server';
import { DashboardKpiRow } from '@/components/adjuster/dashboard-kpi-row';
import { AdjusterShell } from '@/components/layout/adjuster-shell';
import { PageHeader } from '@/components/layout/page-header';
import { VersionFooter } from '@/components/layout/version-footer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const overviewActions = [
  {
    href: '/dashboard',
    title: 'תור עבודה',
    description: 'מעבר לתיקים שממתינים לעיון, בקשת מידע או החלטה.',
    cta: 'פתיחת תור עבודה',
    icon: ClipboardList,
  },
  {
    href: '/questions',
    title: 'תור שאלות',
    description: 'סקירת שאלות פתוחות ותשובות שהתקבלו ממבוטחים.',
    cta: 'פתיחת תור שאלות',
    icon: HelpCircle,
  },
  {
    href: '/new',
    title: 'פתיחת תיק חדש',
    description: 'יצירת תיק בדיקה חדש דרך טופס הקליטה הציבורי.',
    cta: 'פתיחת טופס קליטה',
    icon: PlusCircle,
  },
] as const;

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  await requireUser();

  const claims = await fetchClaimsList({
    status: 'all',
    sort: 'newest',
    page: 1,
    pageSize: 5,
  });

  return (
    <AdjusterShell>
      <div className="space-y-6">
        <PageHeader
          title="דשבורד"
          description="תמונת מצב כללית של פעילות התיקים"
        />
        <DashboardKpiRow summary={claims.summary} />
        <section
          className="grid gap-4 md:grid-cols-3"
          aria-label="פעולות דשבורד מרכזיות"
        >
          {overviewActions.map((action) => (
            <Card key={action.href} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-muted-foreground">
                    <action.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </div>
                <CardDescription className="leading-6">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button asChild variant="outline" className="w-full">
                  <Link href={action.href} prefetch={false}>
                    {action.cta}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
        <VersionFooter />
      </div>
    </AdjusterShell>
  );
}
