# Decisions Log

מסמך זה מתעד את כל ההחלטות האסטרטגיות שהתקבלו לאורך הפרויקט. כל החלטה כוללת קונטקסט, החלטה, נימוק, ו-trade-offs מקובלים.

---

**Version:** 1.7
**Last updated:** 2025-05-03 (post #03ג merge + documents_taxonomy review)
**Previous version:** decisions_03_05_v1_6.md
**Canonical location:** /docs/DECISIONS.md in repo (per D-014)

> **שינויים ב-v1.7:**
> - D-016 (passes claim-level UPSERT) ו-D-017 (HEIC removal) — נכנסו במהלך #03ג, מתועדים פה למלא הסטוריה.
> - **D-018 חדש (two-tier document classification):** טיפול ב-36 סוגי המסמכים מ-documents_taxonomy_03_05_v1_0.md בלי לשבור את DocumentType הקיים ב-types.ts.

---

(D-001 עד D-015 — כפי שמתועדים ב-decisions_03_05_v1_6.md, ללא שינוי)

---

## D-016 — Pass Accounting Is Claim-Level and Cumulative

**Date:** 2025-05-03 (during #03ג v2 PM review)
**Status:** Active
**Implemented in:** PR #14, migration 0004 (function `upsert_pass_increment`)

### Context

טבלת `passes` בסכמה (מוגדרת ב-migration 0002) יש לה `UNIQUE (claim_id, pass_number)`. בטיוטה הראשונית של #03ג שגיתי וחשבתי שאפשר לכתוב שורה לכל מסמך עם `pass_number=1` — INSERT שני נכשל. בנוסף, semantics של "pass" בפרויקט (Pass 1 Initial / Pass 2 Enrichment / Pass 3 Verification) הם **claim-level** ולא per-document.

### Decision

passes הוא claim-level עם UPSERT atomic ועם aggregation מצטבר:
- `upsert_pass_increment(claim_id, pass_number, calls_inc, cost_inc)` — PostgreSQL function
- ON CONFLICT (claim_id, pass_number) DO UPDATE: `llm_calls_made = llm_calls_made + excluded.llm_calls_made`, `cost_usd = cost_usd + excluded.cost_usd`
- Per-call accounting (model_id, tokens, cost) ב-`audit_log.details` בלבד
- Trigger `update_claim_pipeline_state` (קיים מ-0002, AFTER INSERT OR UPDATE OF cost_usd) מעדכן `claims.total_llm_cost_usd` אוטומטית

### Reasoning

- שומר על UNIQUE constraint הקיים בלי שינוי schema
- שומר על semantics המקוריים של passes (Pass 1/2/3 רמת תיק)
- כל הפעולות אטומיות
- claims aggregate נשמר אוטומטית דרך trigger קיים

### Rejected alternatives

- **Per-call passes rows:** מפר UNIQUE, שובר semantics
- **טבלת `llm_calls` חדשה:** premature for POC; אפשר להוסיף בעתיד אם דרושה אנליטיקה (TECH_DEBT 11i)

### Trade-offs accepted

- אין per-call breakdown ישירות מטבלת passes — חייב לחפור באודיט
- Inngest checkpoint failure יכול לגרום double-count (TECH_DEBT 11j tracks idempotency_key)

---

## D-017 — HEIC Removed from New Uploads

**Date:** 2025-05-03 (during #03ג v2 PM review)
**Status:** Active
**Implemented in:** PR #14, migration 0004 (bucket allowed_mime_types)

### Context

#03א הוסיף image/heic ל-bucket `claim-documents` allowed_mime_types. ב-#03ג כשניסיתי להזין ל-Claude API, התברר ש-Anthropic SDK לא תומך ב-image/heic — קריאה תיכשל.

### Decision

מסירים image/heic מ-bucket allowed_mime_types ב-migration 0004. allowlist הופך ל: `[application/pdf, image/jpeg, image/png]`. קבצי HEIC קיימים ב-bucket נשארים נגישים (Supabase לא מוחק אובייקטים בעת שינוי allowlist), אבל העלאות חדשות נחסמות עם `invalid_file_type`.

### Reasoning

- Defense in depth: אין סתירה בין bucket allowlist ל-API validation
- מונע failure-after-upload chain (משתמש מעלה, רואה success, אבל classification נכשל)

### Rejected alternatives

- **Server-side HEIC→JPEG conversion:** דורש sharp/heic-convert dependency — דחוי ל-TECH_DEBT 11g
- **Frontend HEIC→JPEG conversion:** מגדיל bundle size — דחוי ל-TECH_DEBT 11g
- **Block at API only:** drift בין bucket ל-API = bad

### Trade-offs accepted

- משתמשי iPhone (default HEIC) צריכים להמיר ידנית ל-JPEG לפני העלאה — UX friction
- כשתהיה first customer feedback על זה, מטמיעים TECH_DEBT 11g

---

## D-018 — Two-Tier Document Classification (broad category + subtype)

**Date:** 2025-05-03 (post documents_taxonomy_03_05_v1_0.md review)
**Status:** Active
**Will be implemented in:** #03ד-1 (subtype classifier + DB column + migration)

### Context

`documents_taxonomy_03_05_v1_0.md` מגדיר 36 סוגי מסמכים בפירוט רב (טופס תביעה, פוליסה, תקנון, רישיון נהיגה, אישור פינוי רפואי, מכתב מעסיק וכו'). זה רחב יותר משמעותית מ-DocumentType ב-`/lib/types.ts` שמגדיר 8 קטגוריות בלבד (police_report, hotel_letter, receipt, medical_report, witness_letter, flight_doc, photo, other). migration 0004 (#03ג) הוסיף CHECK constraint על documents.document_type עם 8 הערכים בלבד.

הטקסונומיה דורשת רמת פירוט גבוהה יותר — כל subtype עם שדות חיוניים ייחודיים, decision-driving checks ייחודיים, ו-action-on-missing ייחודי.

שתי אופציות נשקלו:
- **(a) הרחבת DocumentType ל-36 ערכים:** שובר types.ts canonical, מחייב migration גדולה (DROP CHECK, ADD 36 values), הופך את Prompt 01 ל-classifier כבד עם 36 קטגוריות (ירידת accuracy צפויה, יותר tokens), שכתוב כל ה-tests
- **(b) Two-tier:** types.ts נשאר עם DocumentType broad (8 קטגוריות), עמודת `document_subtype` חדשה ב-documents (36 ערכים בעברית), Prompt 01 ממשיך לזהות broad category, Prompt 01b חדש מזהה subtype בתוך broad

### Decision

אופציה **(b) — Two-tier**:

1. **schema:** ALTER TABLE documents ADD COLUMN document_subtype text + CHECK constraint עם 36 הערכים (במיגרציה 0005)
2. **types.ts:** DocumentType נשאר 8 ערכים (canonical, no breaking change). DocumentSubtype חדש כ-union של 36 strings בעברית
3. **Prompt 01** (Document Classification, broad): נשאר כפי שהוא — מחזיר אחד מ-8 הקטגוריות
4. **Prompt 01b** (Subtype Classification): רץ אחרי Prompt 01, מקבל את ה-broad category + תוכן המסמך, מחזיר אחד מ-N subtypes שמתאימים לאותה broad category
5. **Mapping per broad category** (לאחסון ב-`/lib/llm/document-subtypes.ts`):
   - `police_report` → [דוח משטרה (14)]
   - `hotel_letter` → [פוליסה (2), תקנון פוליסה (3), הצעה לביטוח (4), אישור הזמנה (28), מכתב מהמלון (16), מכתב מעסיק (36), אישור שגרירות (35), הוראת פינוי (34)]
   - `receipt` → [קבלה (17), קבלה רפואית (23), קבלה תרופות (24), הערכת תיקון (32)]
   - `medical_report` → [אישור רפואי (21), סיכום אשפוז (22), מרשמים (24), תיק רפואי 12 חודשים (25), אישור פינוי רפואי (26)]
   - `witness_letter` → [עדויות (20), תצהיר אירוע (13)]
   - `flight_doc` → [כרטיס טיסה (10), Boarding pass (11), אישור ביטול (27), PIR (15), אישור הזמנה חלופית (28)]
   - `photo` → [תמונות פריטים/נזק (18), מספר סידורי/IMEI (19)]
   - `other` → [טופס תביעה (1), רישיון נהיגה (31), פרטי צד ג' (33), חוזה השכרה (30), דוח נזק (29), רישום משרד הפנים (12), אישור התקשרות עם השגרירות (35)]
6. **Extraction prompts:** רצים פר-subtype, לא פר-broad-category. מסמך 21 (אישור רפואי) → schema שונה ממסמך 22 (סיכום אשפוז), שניהם ב-medical_report broad
7. **Cross-document layers** (name_match, date_in_policy_period, currency_normalization, document_authenticity_check, llm_anomaly_pass): רצים ברמת תיק אחרי שכל המסמכים סווגו והופקו extracted_data. ספיק נפרד #03ה

### Reasoning

- **types.ts canonical preserved:** D-014 מכבד אותו כ-source of truth. שינוי canonical = טריגר ל-cascading changes
- **Migration קטנה ובטוחה:** ADD COLUMN + CHECK בלבד. אין רנפ של נתונים קיימים (כל הרשומות הקיימות יקבלו document_subtype = NULL initially)
- **Prompt 01 נשאר זול ויציב:** 8 קטגוריות עם accuracy גבוה (כבר רץ בפרודקשן ב-#03ג). הוספת tier שני לא פוגעת בקיים
- **Cost incremental:** רק קריאה אחת נוספת ל-Claude per document (~$0.003)
- **Backward compatible:** documents ישנים בלי subtype ממשיכים לעבוד — rules יבדקו subtype אם קיים, broad אם לא
- **Easy to evolve:** אם בעתיד נרצה להוסיף subtype חדש, זה ALTER TABLE לעדכון CHECK + הוספה ל-mapping. בלי לגעת ב-broad classifier
- **Maps cleanly to taxonomy:** הטקסונומיה כבר מקטלגת לפי קטגוריה רחבה (זהות/בסיס/A/B/C/D/E/הקשר), ה-mapping למעלה מתרגם את זה ל-broad DocumentType

### Rejected alternatives

- **(a) הרחבת DocumentType ל-36:** הוערכה כיקרה (Prompt 01 accuracy degradation, breaking change ל-canonical, migration סיכון, שכתוב כל הtests)
- **No subtype, only broad:** מאבד את כל הערך של הטקסונומיה (action-on-missing פר-subtype, decision-driving checks פר-subtype). יהפוך את הטקסונומיה ל-documentation-only

### Trade-offs accepted

- שתי קריאות LLM לסיווג (broad + subtype) במקום אחת — עלות נוספת ~$0.003/מסמך
- complexity של mapping broad↔subtypes צריך להישמר sync עם types.ts ועם DB CHECK
- subtype name in Hebrew — דורש עקביות (TECH_DEBT entry: subtype names ב-config externalized)

### Implementation order

#03ד-1 (next spike): subtype classifier + DB column + 4 broad-category extraction prompts
#03ד-2 (after): subtype-specific extraction prompts לסוגים מורכבים (discharge, prescriptions, evacuation, repair invoice, employer letter, evacuation directive)
#03ה (after): cross-cutting layers (name_match, date_in_policy, currency, authenticity, anomaly_pass)

---

## רשימת החלטות פעילות (סיכום)

D-001, D-002, D-003, D-004, D-005, D-006, D-007, D-008, D-009, D-010, D-011, D-012, D-013, D-014, D-015, **D-016 (new), D-017 (new), D-018 (new)**.

**Footer:**
Decisions Log v1.7 • 2025-05-03 • post #03ג + taxonomy review (D-018 added)
