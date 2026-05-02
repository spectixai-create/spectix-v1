# UI Flows

## Public Flows

### Intake Form - `/new`

Claimants submit a travel insurance claim with documents. This is the only mobile-first screen in the product.

Sections:

- Claimant details.
- Incident details.
- Trip context.
- Document upload.

Hebrew UI copy examples:

```text
פתיחת תיק חדש
פרטי המבוטח
העלאת מסמכים
שלח לבדיקה
```

### Login - `/login`

Adjusters authenticate through Supabase Auth. No signup UI exists; adjusters are seeded by CLI.

```text
כניסה למערכת
אימייל
סיסמה
התנתק
```

## Adjuster Flows

Adjuster flows require authentication after Spike #01. See [ROUTING.md](ROUTING.md).

### Dashboard - `/dashboard`

Work queue with 4 KPI cards, filter bar, and claims table. Clicking a row navigates to `/claim/[id]`.

```text
תור עבודה
תיקים פתוחים
ממתינים לבדיקה
```

### Claim View - `/claim/[id]`

Single-claim view with 4 tabs:

- Brief tab.
- Pass Timeline tab per D-010.
- Documents tab.
- Audit Log tab.

```text
בריף
ציר Pass-ים
מסמכים
יומן ביקורת
```

### Questions Queue - `/questions`

Clarification question management for adjusters. Includes pending, answered, and closed tabs with a Sheet detail panel.

```text
תור שאלות הבהרה
ממתינות
נענו
סגורות
```
