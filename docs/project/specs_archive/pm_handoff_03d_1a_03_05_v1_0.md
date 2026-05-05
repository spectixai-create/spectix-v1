# הודעת פתיחה ל-Chat 2-B (PM) — סקירת מפרט #03ד-1a

**מהות הסקירה:** מפרט CEO לספיק חדש — הקמת תשתית לסיווג subtype של מסמכים (D-018, two-tier classification). זהו הראשון מתוך פיצול #03ד-1 ל-1a + 1b.

---

## הקשר קצר (מצב הפרויקט)

PR #15 (hotfix) מוזג. main @ `d02c0dc`. Production stable. claim 2026-757 חוצה את ה-pipeline המלא: upload → broad classification (Sonnet 4.5) → processed, ב-$0.007/document.

17/26 ספיקים הושלמו. הבא: **#03ד-1a** — תשתית ל-subtype classification (36 ערכים).

## מה עושה הספיק הזה

תוכן core:
1. Migration 0005 — הוספת `documents.document_subtype` (text, nullable) + CHECK ל-36 ערכים + partial index.
2. `/lib/types.ts` — הוספת `DocumentSubtype` (union 36), `Document.documentSubtype`, `DocumentSubtypeClassifiedEvent`, ועדכון `SpectixInngestEvent`.
3. `/lib/llm/document-subtypes.ts` — חדש. Mapping `broad → subtypes`, Hebrew labels, DAG phase, helpers `canSkip`/`getOnlySubtype`.
4. `/lib/llm/classify-subtype.ts` — חדש. Prompt 01b. Fast-path לbroad → 1 subtype (חיסכון ~$0.003 פר מסמך ב-4 broads).
5. `/inngest/functions/process-document.ts` — הוספת step `claude-classify-subtype` בין הclassifier הקיים ל-finalize. שני events יוצאים בהצלחה: הקיים `processed` + חדש `subtype_classified`.
6. `/docs/DECISIONS.md` — D-018.
7. `/docs/HARD_REQUIREMENTS.md` — תיקון transliteration `#03b` → `#03ב`.
8. `/docs/PM_REVIEW_CHECKLIST.md` — סעיפים 5.11 (vendor citation לexternal identifiers) + 5.12 (dirty-input tests לparsing/sanitization). שני אלה משקפים שורש הבעיה ב-PR #15.
9. `/docs/DB_SCHEMA.md` + `MIGRATIONS.md` + `CURRENT_STATE.md` + `specs/README.md` + `lib/version.ts` (bump ל-Spike #18).

מחוץ לטווח (ל-1b):
- 4 broad extraction prompts (02, 03, 04, 05). לא נוגעים פה.
- כתיבת `extracted_data` schema לפי subtype. לא נוגעים פה.
- skeleton uploader removal. נדחה ל-1b כדי לשמור על focus.

## למה פיצלתי ל-1a + 1b

#03ד-1 כספיק יחיד בקנה מידה של 1,500+ LoC חוזר על דפוס PR #14 (גדול → integration bug → hotfix). 1a הוא foundation יציב עם surface area קטן. 1b בונה עליו וניתן לבצע במקביל אחרי merge.

## נקודות שבדקתי לפני כתיבה (אנטי-patterns)

1. **Schema invented from memory** — אימתתי כל מבנה מול ה-main HEAD בריפו: `types.ts`, `classify-document.ts`, `client.ts`, migrations 0001-0004, rollbacks, `process-document.ts`, `DECISIONS.md`, `HARD_REQUIREMENTS.md`, `PM_REVIEW_CHECKLIST.md`, `DB_SCHEMA.md`, `spike-template.md`, `spike-03c.md`. הקוד במפרט עוקב במדויק אחרי הדפוסים הקיימים (deps pattern, error classes, audit actor convention, DO $$ verification, partial index).
2. **External API identifier invented from memory** — לא הוזכר model id חדש. הקוד מסתמך על `callClaudeJSON` הקיים שמשתמש ב-`DEFAULT_MODEL` שכבר מאומת ב-`client.ts`.
3. **Spec contains parsing/sanitization but tests use clean mocks** — הוספתי טסט #6 ב-`classify-subtype.test.ts` שדורש dirty input (rawText עם code fences). זה ממוסד ב-PM checklist 5.12 שמופיע באותה PR.

## שאלות פתוחות שמיועדות ל-PM

מופיעות בסעיף 17 של המפרט. בקצרה:
1. אישור placement של `prescriptions_and_pharmacy` ב-broad `other` (DAG Phase 3).
2. אישור ש-`medical_record_12mo` יושב ב-broad `other` ולא ב-`medical_report` (לפי הויזואליות, האם זה הגיוני?).
3. אישור על silent fallback כש-LLM מחזיר subtype לא חוקי (alternative: fail document). דעתי — silent + audit נכון כי broad type נשאר נכון.

## מה אני מבקש מה-PM

סקירה רגילה לפי `/docs/PM_REVIEW_CHECKLIST.md`. במיוחד:
- Section 1 (Migration validation) — Migration 0005 + Rollback 0005.
- Section 2 (Schema-write specs) — finalize-processed UPDATE עם document_subtype, audit_log entries חדשות.
- Section 3 (Inngest specs) — orchestration update, retry behavior, concurrency, idempotency.
- Section 5.5, 5.6 (TECH_DEBT quality, D-014 docs canonical).
- Section 8 (anti-patterns) — וידוא שאני לא חוזר על העבר.

PM יודיע לי בלוג Section X.Y → blocking/important/cosmetic, עם תיקון ספציפי. אחרי איטרציה, ה-spec יישלח ל-Codex ל-implementation.

## הקובץ

המפרט עצמו: `/home/claude/work/ceo_spec_spike_03d_1a_03_05_v1_0.md` — 1,015 שורות.
מצורף לפנייה הזו.
