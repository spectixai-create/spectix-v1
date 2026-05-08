type LegalKind = 'terms' | 'privacy';

const content: Record<
  LegalKind,
  {
    title: string;
    intro: string;
    points: string[];
  }
> = {
  terms: {
    title: 'תנאי שימוש',
    intro:
      'מסמך זה הוא טיוטת תנאי שימוש לצורך הדגמת MVP בלבד ואינו מהווה ייעוץ משפטי או נוסח מסחרי מחייב.',
    points: [
      'Spectix מסייעת בארגון תיק התביעה, זיהוי חוסרים והכנת שאלות השלמה.',
      'המערכת אינה מקבלת החלטה אוטומטית בתביעה ואינה מחליפה את שיקול הדעת של נציג התביעות.',
      'אין להשתמש במערכת עם מידע אמיתי או רגיש ללא אישור משפטי ותפעולי נפרד.',
    ],
  },
  privacy: {
    title: 'מדיניות פרטיות',
    intro:
      'מסמך זה הוא טיוטת מדיניות פרטיות לצורך הדגמת MVP בלבד ואינו מיועד לשימוש מסחרי.',
    points: [
      'בשלב ההדגמה יש להשתמש בנתונים סינתטיים או מסוננים בלבד.',
      'אין להעלות דרכונים, מסמכים רפואיים, פרטי טיסה או מידע אישי אמיתי ללא אישור נפרד.',
      'נתוני הסכמה נשמרים במינימום הנדרש: גרסת תנאים, גרסת פרטיות וזמן אישור.',
    ],
  },
};

export function DraftLegalContent({
  kind,
}: Readonly<{
  kind: LegalKind;
}>) {
  const item = content[kind];

  return (
    <div className="space-y-5 text-start">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        טיוטה — לא לשימוש מסחרי
      </div>
      <div className="space-y-2">
        <h1 className="font-heb text-3xl font-semibold tracking-normal">
          {item.title}
        </h1>
        <p className="leading-7 text-muted-foreground">{item.intro}</p>
      </div>
      <ul className="list-disc space-y-2 pe-5 text-sm leading-7 text-muted-foreground">
        {item.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}
