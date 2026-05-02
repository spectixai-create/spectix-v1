import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type RiskBand = 'green' | 'yellow' | 'orange' | 'red';

const riskBandMeta: Record<
  RiskBand,
  {
    label: string;
    description: string;
    score: number;
    badge: React.ComponentProps<typeof Badge>['variant'];
    dotClassName: string;
    bgClassName: string;
    meterClassName: string;
  }
> = {
  green: {
    label: 'ירוק',
    description: 'סיכון נמוך',
    score: 25,
    badge: 'risk-green',
    dotClassName: 'bg-risk-green',
    bgClassName: 'bg-risk-green-bg',
    meterClassName: 'bg-risk-green',
  },
  yellow: {
    label: 'צהוב',
    description: 'דורש בדיקה',
    score: 50,
    badge: 'risk-yellow',
    dotClassName: 'bg-risk-yellow',
    bgClassName: 'bg-risk-yellow-bg',
    meterClassName: 'bg-risk-yellow',
  },
  orange: {
    label: 'כתום',
    description: 'סיכון מוגבר',
    score: 75,
    badge: 'risk-orange',
    dotClassName: 'bg-risk-orange',
    bgClassName: 'bg-risk-orange-bg',
    meterClassName: 'bg-risk-orange',
  },
  red: {
    label: 'אדום',
    description: 'סיכון גבוה',
    score: 100,
    badge: 'risk-red',
    dotClassName: 'bg-risk-red',
    bgClassName: 'bg-risk-red-bg',
    meterClassName: 'bg-risk-red',
  },
};

export function RiskBadge({
  band,
  className,
}: Readonly<{
  band: RiskBand;
  className?: string;
}>) {
  return (
    <Badge className={className} variant={riskBandMeta[band].badge}>
      {riskBandMeta[band].label}
    </Badge>
  );
}

export function RiskPill({
  band,
  className,
}: Readonly<{
  band: RiskBand;
  className?: string;
}>) {
  const meta = riskBandMeta[band];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
        meta.bgClassName,
        className,
      )}
    >
      <span
        className={cn('h-2 w-2 rounded-full', meta.dotClassName)}
        aria-hidden="true"
      />
      <span className="font-medium">{meta.label}</span>
      <span className="text-muted-foreground">{meta.description}</span>
    </div>
  );
}

export function RiskMeter({
  band,
  label,
}: Readonly<{
  band: RiskBand;
  label?: string;
}>) {
  const meta = riskBandMeta[band];

  return (
    <div className="space-y-2" data-risk-band={band}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label ?? meta.description}</span>
        <span className="num font-latin text-muted-foreground">
          {meta.score}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', meta.meterClassName)}
          style={{ width: `${meta.score}%` }}
        />
      </div>
    </div>
  );
}

export function RiskLegend() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {(Object.keys(riskBandMeta) as RiskBand[]).map((band) => (
        <RiskPill key={band} band={band} />
      ))}
    </div>
  );
}

export { riskBandMeta };
