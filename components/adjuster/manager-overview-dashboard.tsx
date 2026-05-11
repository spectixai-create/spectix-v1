import Link from 'next/link';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  HelpCircle,
  PlusCircle,
  SearchCheck,
  ShieldAlert,
  TimerReset,
  WalletCards,
} from 'lucide-react';

import type { ClaimListItem, ClaimListResponse } from '@/lib/adjuster/types';
import { CLAIM_STATUS_LABELS, getClaimTypeLabel } from '@/lib/ui/strings-he';
import { Tag } from '@/components/data-display/tag';
import { StatCard } from '@/components/data-display/stat-card';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

export function ManagerOverviewDashboard({
  data,
}: Readonly<{
  data: ClaimListResponse;
}>) {
  const sections = buildOverviewSections(data.items);

  return (
    <div className="space-y-6">
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="מדדי דשבורד מנהלים"
      >
        <StatCard
          label="תיקים פתוחים"
          value={<NumberValue value={data.summary.totalOpen} />}
          icon={FileText}
        />
        <StatCard
          label="מוכנים להחלטה"
          value={<NumberValue value={data.summary.ready} />}
          icon={CheckCircle2}
          trend={<Tag tone="success">מוכן</Tag>}
        />
        <StatCard
          label="ממתינים ללקוח"
          value={<NumberValue value={data.summary.pendingInfo} />}
          icon={HelpCircle}
        />
        <StatCard
          label="בבדיקה מוגברת"
          value={<NumberValue value={data.summary.enhancedReview} />}
          icon={AlertTriangle}
          trend={<Tag tone="warning">דורש תשומת לב</Tag>}
        />
        <StatCard
          label="בחקירה"
          value={<NumberValue value={data.summary.investigation} />}
          icon={ShieldAlert}
        />
        <StatCard
          label="בחריגת SLA"
          value={<NumberValue value={data.summary.slaBreached} />}
          icon={TimerReset}
          trend={<Tag tone="warning">חריגה</Tag>}
        />
        <StatCard
          label="זמן טיפול ממוצע"
          value={<DaysValue value={data.summary.averageHandlingDays} />}
          icon={Clock3}
        />
        <StatCard
          label="זמן ממוצע עד בקשת השלמה"
          value={
            <DaysValue value={data.summary.averageTimeToInfoRequestDays} />
          }
          icon={Clock3}
          helper="אומדן לפי תיקים שממתינים ללקוח"
        />
        <StatCard
          label="תיקים עם חוסרים"
          value={<NumberValue value={data.summary.claimsWithGaps} />}
          icon={SearchCheck}
        />
        <StatCard
          label="תיקים עם אי-התאמות"
          value={<NumberValue value={data.summary.claimsWithInconsistencies} />}
          icon={SearchCheck}
        />
        <StatCard
          label="סכום תביעות פתוחות"
          value={<CurrencyValue value={data.summary.openClaimAmount} />}
          icon={Banknote}
        />
        <StatCard
          label="סכום תביעות בבדיקה מוגברת"
          value={<CurrencyValue value={data.summary.enhancedReviewAmount} />}
          icon={WalletCards}
        />
      </section>

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

      <div className="grid gap-5 xl:grid-cols-2">
        {sections.map((section) => (
          <OverviewClaimSection key={section.title} section={section} />
        ))}
      </div>
    </div>
  );
}

function buildOverviewSections(items: ClaimListItem[]) {
  return [
    {
      title: 'תיקים תקועים',
      description: 'פתוחים 4+ ימים או ללא עדכון לאחרונה',
      items: items.filter((item) => item.isStuck).slice(0, 5),
    },
    {
      title: 'תיקים בחריגת SLA',
      description: 'תיקים שחצו את יעד הטיפול הראשוני',
      items: items.filter((item) => item.slaStatus === 'breached').slice(0, 5),
    },
    {
      title: 'תיקים בבדיקה מוגברת',
      description: 'תיקים עם דגלי בדיקה או העברה לחוקר',
      items: items.filter((item) => isEnhancedReviewItem(item)).slice(0, 5),
    },
    {
      title: 'תיקים מוכנים להחלטה',
      description: 'תיקים שמוכנים לעיון מומחה',
      items: items.filter((item) => item.status === 'ready').slice(0, 5),
    },
    {
      title: 'תיקים עם סכום גבוה',
      description: 'התביעות הפתוחות הגבוהות ביותר בתור',
      items: [...items]
        .filter((item) => item.amountClaimed !== null && isOpenItem(item))
        .sort((a, b) => (b.amountClaimed ?? 0) - (a.amountClaimed ?? 0))
        .slice(0, 5),
    },
    {
      title: 'תיקים ממתינים ללקוח',
      description: 'תיקים שבהם נדרשת השלמת מידע',
      items: items.filter((item) => item.status === 'pending_info').slice(0, 5),
    },
  ];
}

function isEnhancedReviewItem(item: ClaimListItem): boolean {
  return (
    item.riskBand === 'red' ||
    item.riskBand === 'orange' ||
    item.handlingStatus === 'investigation'
  );
}

function isOpenItem(item: ClaimListItem): boolean {
  return item.status !== 'reviewed' && item.status !== 'rejected_no_coverage';
}

function OverviewClaimSection({
  section,
}: Readonly<{
  section: {
    title: string;
    description: string;
    items: ClaimListItem[];
  };
}>) {
  return (
    <section className="rounded-md border bg-card" aria-label={section.title}>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{section.title}</h2>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>
      {section.items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">אין תיקים להצגה</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>תיק</TableHead>
                <TableHead>מבוטח</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>סכום</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>סיבת בדיקה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.items.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-latin font-medium">
                    <Link href={`/claim/${claim.id}`} prefetch={false}>
                      {claim.claimNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {claim.insuredName ?? claim.claimantName ?? 'לא ידוע'}
                  </TableCell>
                  <TableCell>{getClaimTypeLabel(claim.claimType)}</TableCell>
                  <TableCell className="font-latin">
                    {formatCurrency(claim.amountClaimed, claim.currency)}
                  </TableCell>
                  <TableCell>{CLAIM_STATUS_LABELS[claim.status]}</TableCell>
                  <TableCell>{claim.slaLabel}</TableCell>
                  <TableCell>{claim.reviewReason ?? 'אין'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function NumberValue({ value }: Readonly<{ value: number }>) {
  return <span className="num font-latin">{value}</span>;
}

function DaysValue({ value }: Readonly<{ value: number }>) {
  return (
    <span>
      <span className="num font-latin">{value}</span> ימים
    </span>
  );
}

function CurrencyValue({ value }: Readonly<{ value: number }>) {
  return <span className="num font-latin">{formatCurrency(value, 'ILS')}</span>;
}

function formatCurrency(amount: number | null, currency: string): string {
  if (amount === null) return 'לא צוין';

  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
