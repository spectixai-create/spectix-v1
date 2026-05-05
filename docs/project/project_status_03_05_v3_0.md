# מצב הפרויקט — Spectix Claim Investigator POC

**Last updated:** 2025-05-03  
**Status version:** v3.0 (post PR #16 merge)

## מה זה הפרויקט

Spectix — POC לחקירת תביעות ביטוח נסיעות. מערכת iterative שמסווגת מסמכים, מפעילה כללי חקירה (R01-R09), ומפיקה Investigation Brief לאדם המבטח. Stack: Next.js 14 + Supabase (Frankfurt) + Inngest + Claude API + Vercel. Hebrew/RTL. POC → לקוח ראשון = מבטח קטן ישראלי.

- **Repo:** https://github.com/spectixai-create/spectix-v1
- **Production:** https://spectix-v1.vercel.app
- **Local workspace:** `C:\Users\smart\spectix\`
- **Supabase ref:** `fcqporzsihuqtfohqtxs`
- **Domain:** spectix.ai
- **שעות שבועיות:** 30-40

## מצב Production נוכחי

- **main HEAD:** `<merge SHA — fill after PR #16 merge>` (post #03ד-1a)
- **App version:** Spike #18 • 2025-05-03
- **Test counts:** 92 unit + 61 e2e passing
- **Real two-tier LLM classification working end-to-end:**
  - Broad classifier (Prompt 01) + Subtype classifier (Prompt 01b)
  - Sonnet 4.5 (`claude-sonnet-4-5-20250929`) classifying real PDFs
  - Cost: ~$0.007 broad + ~$0.003 subtype (LLM-path) or $0 (skip-path)
  - Production smoke baseline: processing_time_ms = 6,902-12,577ms across 3 documents (skip-path + LLM-path)
  - audit_log: actor_type='llm', actor_id=model_id (success); actor_id=DEFAULT_MODEL on failure
- **Skip-path subtypes (4):** police_report, hotel_letter, witness_letter, photo — single deterministic mapping, no LLM call
- **LLM-path subtypes:** receipt, medical_report, flight_doc, other — Prompt 01b runs

## מבנה הצ'אטים

- **Chat 1 (CEO):** אסטרטגיה, ארכיטקטורה, החלטות, מפרטי ספיקים
- **Chat 2-B (PM):** סקירת מפרטים. עבר v1→v2→v3 על ספיק #03ד-1a — תפקוד מצוין
- **Chat 4 (Codex):** ביצוע. git/Vercel/browser/CLI access. PRs פתוחים מולו

מבנה: CEO → PM → Codex. כשתיקון פתור לחלוטין ב-CEO, ניתן ללכת ישירות ל-Codex (כמו ב-PRs קודמים).

הוראת המשתמש: **"אתה הCEO תעשה מה שצריך, מה שלא קשור אליך תרשום פרומט עבור קודקס."** עצמאות + החלטות + תוצרים מוכנים.

## ספיקים שהושלמו (18/26 = 69%)

| # | ספיק | PR | merge SHA |
|---|---|---|---|
| 00 → 02b | Foundation + UI skeletons | #1-#5 | — |
| 00a | /lib/types.ts contract | #6 | — |
| 01 | Auth Wiring | direct | 277716d |
| 00z-A | Documentation Infrastructure | #7 | — |
| 02c-1 | Schema Gap Audit | #8 | — |
| migration-0002 | Schema Audit Implementation | #9 | — |
| 02c-2 | POST /api/claims + form wiring | #10 | 3854c05 |
| 03א | File upload + Storage | #11 | dc05453 |
| docs | PM Review Checklist v1.0 | #12 | 9b67405 |
| 03ב | Inngest pipeline + processing_status | #13 | 3dae2a8 |
| 03ג | Claude API + Document Classifier (Prompt 01) | #14 | 858f446 |
| hotfix | Model ID + JSON parse robustness | #15 | d02c0dc |
| **03ד-1a** | **Subtype classifier + DB + orchestration** | **#16** | **`<merge SHA>`** |

## ספיקי #03 — תכנון מעודכן

- ✅ #03א — File upload + Storage
- ✅ #03ב — Inngest pipeline + processing_status
- ✅ #03ג — Claude API + Document Classifier (broad — Prompt 01)
- ✅ **#03ד-1a — Subtype classifier (Prompt 01b) + 4 broad mapping + DB column document_subtype + Inngest orchestration**
- ⏳ **#03ד-1b** — 4 broad extraction prompts (02 receipt, 03 police, 04 hotel-generic, 05 medical) + extracted_data wiring **(הצעד הבא)**
- ⏳ #03ד-2 — 14 dedicated extraction prompts (subtype-specific)
- ⏳ #03ה — 5 cross-cutting layer schemas (name_match, date_in_policy, currency_normalization, document_authenticity_check, llm_anomaly_pass)

## החלטות פעילות (D-001 עד D-018)

D-001-D-015 פעילים מהצ'אט הקודם, ב-/docs/DECISIONS.md. שלוש החלטות אקטיביות מהספיקים האחרונים:

- **D-016 (post #03ג):** passes טבלה היא claim-level עם cumulative UPSERT. trigger update_claim_pipeline_state (AFTER INSERT OR UPDATE OF cost_usd) מעדכן claims אוטומטית.
- **D-017 (post #03ג):** HEIC הוסר מ-bucket allowlist (Anthropic SDK לא תומך). TECH_DEBT 11g tracks future conversion.
- **D-018 (#03ד-1a):** Two-tier document classification — broad DocumentType (8) + subtype (37, כולל פיצול pharmacy_receipt + prescription). Prompt 01 unchanged. Prompt 01b מסווג subtype. Invalid LLM response → documentSubtype=null (data integrity over fabricated default). Documented in /docs/DECISIONS.md.

## HARD REQUIREMENTS

- HR-001 (stuck-document watchdog) — סגור ב-PR #14
- אין HR פתוחים כרגע. note: TECH_DEBT 11n מטרק את ה-watchdog threshold revisit אם p95 processing_time_ms > 60s.

## TECH_DEBT פעיל (קצר)

- 10m: CHECK constraint על audit_log.actor_type — לפני production launch
- 11a: recovery job ל-orphaned pending docs
- 11c: events.ts split כש-10+ event types
- 11g: HEIC→JPEG conversion (frontend)
- 11h: Claude pricing source-of-truth (config externalized)
- 11i: llm_calls table per-call analytics
- 11j: UPSERT idempotency_key
- 11k: storage download caching בין steps (broad+subtype משתפים file). Owner: CEO. Trigger: first Supabase invoice line item showing storage egress > 0.
- 11l: typed extracted_data subtype block schema. Owner: CEO. Trigger: simultaneous with #03ד-1b PR.
- 11m: invalid-subtype audit alerting. Owner: PM. Trigger: 3rd llm_returned_invalid_subtype audit in 30 days.
- 11n: watchdog threshold revisit. Owner: PM (weekly query). Trigger: p95 processing_time_ms > 60s over 7-day window. Current baseline: 7-13s.
- 11o: RPC dedup key for upsert_pass_increment. Owner: CEO. Trigger: SUM(audit_log.cost_usd) vs claims.total_llm_cost_usd diff > 5% across 10+ claims/week.
- 11p: 37-value subtype vocabulary cross-validation between types.ts/migration/test. Owner: CEO. Trigger: next subtype addition OR first runtime CHECK violation.

חדשים שצריך להפתח כ-issues אחרי merge:
- `tech-debt-e2e-claim-counter-collision` — claim sequence הגיע ל-2026-1000 וגורם ל-409s ב-e2e.
- `tech-debt-historical-processing-time-ms` — ערכי processing_time_ms של documents שעברו pipeline לפני SHA `8d8cee9d` הם לא מהימנים (instrumentation bug תוקן ב-PR #16). מסמן את הטווח אם נדרש analytics רטרואקטיבי.

## אנטי-patterns שלי — חובה לזכור

3 אנטי-patterns שעמדו בלב הסיבובים האחרונים:

1. **Schema/value invented from memory** — נתפסתי 5+ פעמים על-ידי PM. כל INSERT/event/API config דורש אימות מול הריפו לפני כתיבה. תמיד `curl https://raw.githubusercontent.com/spectixai-create/spectix-v1/main/...` לפני כל מפרט.

2. **External API identifiers invented from memory** — model ID `claude-sonnet-4-6-20250915` הומצא מהזיכרון ב-PR #14. Production נשבר. תמיד web_search לאמת model IDs/API endpoints/version strings לפני שחותם על מפרט. PM checklist 5.11 ממוסד את החובה הזו.

3. **Spec contains parsing/sanitization but tests use clean mocks** — ה-cleanup ב-`lib/llm/client.ts` לא היה ב-tests, ו-Sonnet 4.5 שהחזיר JSON עטוף בקוד fence שבר את ה-strict parser. PM checklist 5.12 דורש dirty-input test כשspec כולל normalize/strip/clean.

## הצעד הבא — מפרט #03ד-1b

Section B של `codex_master_03d_1a_1b_03_05_v1_0.md` בProject Knowledge הוא ה-spec המלא. נשלח ל-Codex כקובץ נפרד.

**Scope:**
1. 4 קבצי extractors חדשים: extract-receipt.ts, extract-police.ts, extract-hotel-generic.ts, extract-medical.ts
2. routing function: route-by-subtype.ts (37 subtypes → 4 routes או skip)
3. extension של process-document.ts: extraction step אחרי finalize-processed
4. extracted_data discriminated union (kind matches DocumentType)
5. Degraded success: extraction failure → document נשאר processed (broad+subtype נשמרים)
6. New events: DocumentExtractedEvent + DocumentExtractionFailedEvent
7. version bump ל-Spike #19

**גודל משוער:** ~1,200-1,500 LoC (4 extractors דומים, אולי קצר יותר אחרי extraction של helpers משותפים).

## מסמכים ב-Project Knowledge

- **`README.md`** — לא השתנה לאחרונה
- **`llm_prompts.md`** — מ-Project Knowledge המקורי. **אזהרה:** מכיל schemas של Prompts 01-10 שעדיין לא אומתו פר-מסמך מול הטקסונומיה. אמת מול documents_taxonomy v1.1 ומול ה-discriminated union ב-/lib/types.ts לפני usage.
- **`test_scenarios.md`** — 31 תיקי דמה. רלוונטי ל-Validation phase (לא עכשיו).
- **`development_plan.md`** — תכנית מקורית.
- **`documents_taxonomy_03_05_v1_1.md`** — basis ל-#03ד-1b, #03ד-2, #03ה. 36 סוגי מסמכים → 37 לאחר split של pharmacy/prescription.
- **`decisions_03_05_v1_7.md`** — D-001-D-018.
- **`ceo_spec_spike_03d_1a_03_05_v1_1.md`** — ספיק v1.1 (post PM v1).
- **`codex_master_03d_1a_1b_03_05_v1_0.md`** — Section A (10 patches → v1.2) + Section B (#03ד-1b spec).

## הצעד המיידי

1. ✅ PR #16 מוזג. main HEAD מתעדכן ל-`<merge SHA>`.
2. ✅ Vercel deploy ירוק. footer מציג "Spike #18 • 2025-05-03".
3. ⏳ פתיחת 2 issues ב-GitHub: claim-counter-collision + historical-processing-time-ms.
4. ⏳ שליחת קובץ הסקציה הב' ל-Codex להתחלת PR #2 (#03ד-1b).
5. ⏳ ממתין ל-Codex לפתוח branch `backend-broad-extraction-prompts` ולדחוף PR #17.

## הוראות גנרליות מהמשתמש

- **שפה:** עברית, כולל מונחים מקצועיים. אנגלית רק לשמות קבצים, paths, פונקציות, משתנים.
- **עדכון קבצים:** לבדוק גרסה קודמת. לעדכן מספר גרסה בתוכן ובשם. פורמט: `יום_חודש_גרסה`. בקבצי UI footer עם גרסה.
- **תקשורת:** מהיר ויעיל. בלי הסברים מיותרים. כשיש תשובה ברורה — מבצע ולא שואל.

---

**Footer:** project_status v3.0 • 2025-05-03 • post PR #16 merge
