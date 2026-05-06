# Spectix - תכנית ביצוע ברמת מבט-על

**תאריך:** 06/05/2026
**מטרה:** מפת דרכים רחבה לידיעת ה-CEO. כל סעיף ניתן לאימות מול הריפו על-ידי Codex.

---

## בוצע ✅

| #   | שכבה                                                         | מקור-אימות בריפו      |
| --- | ------------------------------------------------------------ | --------------------- |
| 1   | תשתית: Auth, UI skeletons, schema, intake form               | PRs #1-#10, main      |
| 2   | העלאת מסמכים + Storage                                       | PR #11                |
| 3   | Pipeline (Inngest + processing_status lifecycle)             | PR #13                |
| 4   | סיווג רחב (Prompt 01) - 8 broad types                        | PRs #14, #15          |
| 5   | סיווג subtype (Prompt 01b) - 37 subtypes                     | PR #16                |
| 6   | 4 broad extraction prompts (receipt, police, hotel, medical) | PR #18                |
| 7   | Pass lifecycle completion fix                                | PR #38                |
| 8   | Normalized extraction contracts (schema-first)               | PR #50                |
| 9   | 7 dedicated normalized extraction routes (priority MVP)      | PR #52                |
| 10  | Documentation post-merge retro                               | PR #56 (מוכן ל-merge) |

---

## נשאר לביצוע ❌

### 11. שכבות validation חוצות-מסמכים (היה #03ה במקור)

- 11.1 התאמת שמות (name_match)
- 11.2 אימות תאריכים (date validation)
- 11.3 נרמול מטבעות (currency)
- 11.4 בדיקת אותנטיות מסמך (authenticity)
- 11.5 זיהוי חריגות (anomaly)

### 12. שכבת Synthesis

- 12.1 **SPRINT-003A**: Data model (הצעד הבא המתוכנן)
- 12.2 Rules engine - 9 כללים תוכננו במקור
- 12.3 Findings generation (אנומליות, פערים)
- 12.4 Clarification questions generation
- 12.5 Readiness score (Rule 07 בתכנית המקורית)

### 13. UI לבוחן (adjuster) - מצב חלקי

- 13.1 Brief view (skeleton בלבד מ-#00d - דורש wiring לנתונים אמיתיים)
- 13.2 Dashboard (skeleton בלבד מ-#00e)
- 13.3 Questions queue (skeleton בלבד מ-#02b)
- 13.4 Documents review screen (לא קיים)
- 13.5 Findings review + actions (לא קיים)
- 13.6 Decision flow (approve/reject/escalate)

### 14. Knowledge Base (`/kb/` בריפו)

- 14.1 Police formats per country (3 ראשונות בתכנית)
- 14.2 Hotel format catalog
- 14.3 Reference data נוסף

### 15. QA + Test fixtures

- 15.1 Synthetic fixtures (9/31 קיימים)
- 15.2 22 fixtures נוספים ל-31 התרחישים
- 15.3 Regression suite
- 15.4 End-to-end validation pass

### 16. Production hardening (חלק מ-TECH_DEBT)

- 16.1 HEIC→JPEG conversion (frontend)
- 16.2 Storage cleanup on claim delete
- 16.3 Pricing source-of-truth externalization
- 16.4 llm_calls table per-call analytics
- 16.5 שאר items מ-`docs/TECH_DEBT.md`

### 17. שאלות פתוחות (החלטות מוצר חסרות)

- 17.1 האם 7 ה-routes הנוספים מ-#03ד-2 (14 בסך הכל מתוכננים) נדרשים ל-MVP, או ש-broad fallback מספיק לכולם?
- 17.2 מה קריטריון "מוכן ל-demo"?
- 17.3 האם UI adjuster ב-MVP או דחוי לאחרי?

---

## משימה ל-Codex

לאמת מול הריפו (`main` אחרי merge של #56):

**עבור הסעיפים המסומנים ✅ (1-10):** לאשר שכל PR קיים וממוזג.

**עבור הסעיפים ❌ (11-16):** לבדוק אם יש קוד/קבצים בריפו שמכסים חלקית או מלא, גם אם לא תועד פה. דגש על:

- חיפוש קבצים תחת `/lib/synthesis/`, `/lib/rules/`, `/lib/validation/`, `/kb/`
- חיפוש מסכי adjuster תחת `/app/(adjuster)/`
- סריקת `docs/specs/` לחפש ספקים שכבר נכתבו לסעיפים 11-15
- שליפה מ-`docs/DECISIONS.md` של החלטות שמשפיעות על scope של 17.1-17.3

**פלט מבוקש מ-Codex:**

1. אישור/תיקון לכל אחד מ-1-10 (PR קיים? merged? SHA?)
2. עבור 11-16: רשימת קבצים קיימים בריפו שמכסים סעיפים אלה (גם חלקית), אם יש
3. אם נמצא scope שלא רשום פה - להוסיף סעיף 18+

**Codex לא:**

- לא לכתוב קוד חדש
- לא לפתוח PRs
- לא לרוץ smoke
- רק קריאה + אימות

---

## גרסה

PLAN-OVERVIEW v1.0 — 06/05/2026
