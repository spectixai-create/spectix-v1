import type { ClaimantPortalState } from '@/lib/claimant/types';

const COPY: Record<
  ClaimantPortalState,
  { title: string; body: string; tone: string }
> = {
  valid: {
    title: 'הקישור פעיל',
    body: 'ניתן להשלים את המידע המבוקש.',
    tone: 'border-emerald-200 bg-emerald-50',
  },
  invalid: {
    title: 'הקישור אינו תקין',
    body: 'יש לבקש מהמטפל בתביעה לשלוח קישור חדש.',
    tone: 'border-red-200 bg-red-50',
  },
  expired: {
    title: 'תוקף הקישור פג',
    body: 'יש לבקש מהמטפל בתביעה לשלוח קישור חדש.',
    tone: 'border-amber-200 bg-amber-50',
  },
  revoked: {
    title: 'הקישור בוטל',
    body: 'נשלח קישור חדש או שהקישור הזה אינו פעיל עוד.',
    tone: 'border-red-200 bg-red-50',
  },
  used: {
    title: 'התשובות כבר נשלחו',
    body: 'המידע התקבל ואין צורך לשלוח שוב דרך הקישור הזה.',
    tone: 'border-slate-200 bg-white',
  },
  done: {
    title: 'התשובות נשלחו בהצלחה',
    body: 'תודה. התביעה תיבדק שוב עם המידע המעודכן.',
    tone: 'border-emerald-200 bg-emerald-50',
  },
};

export function ClaimantStatePage({ state }: { state: ClaimantPortalState }) {
  const copy = COPY[state];

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-12">
      <section
        className={`w-full rounded-lg border p-8 shadow-sm ${copy.tone}`}
      >
        <p className="text-sm font-medium text-slate-500">Spectix</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          {copy.title}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-700">{copy.body}</p>
      </section>
    </div>
  );
}
