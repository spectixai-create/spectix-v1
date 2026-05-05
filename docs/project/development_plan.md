# Development Plan — Claim Investigator POC

מסמך תכנון לניהול הפיתוח. מגדיר מבנה ארגוני (7 צ'טים), חלוקת אחריות, זרימת מידע, וניהול ידע.

---

## עקרון מנחה

הפיתוח מבוצע **ע"י 7 צ'טים נפרדים** ב-Claude.ai, כל אחד בתפקיד ייעודי. זה מבנה ארגוני מקצועי שמפריד בין רמות אחריות — אסטרטגיה, ניהול ביצוע, עיצוב, ביצוע, מחקר, בדיקות.

הסוכנים מבצעים בפועל (Claude Code, Codex) — אבל **ההוראות והבדיקות מנוהלות ע"י צ'טים נפרדים** עם הקשרים ייעודיים.

החלוקה גם מאפשרת **התקדמות הדרגתית** — מתחילים עם 3 צ'טים, מתפתחים ל-7 לפי הצורך.

---

## 1. מבנה הצ'טים — 7 תפקידים

### Chat 1 — CEO (ניהול ותכנון אסטרטגי)

**זה הצ'ט הנוכחי.** התפקיד הבכיר ביותר.

**אחריות:**
- החלטות אסטרטגיות (מה לבנות, מה לדחות)
- ארכיטקטורה (שכבות, pipeline, schema)
- ניהול מסמכי תכנון עליונים
- החלטות על שינויי כיוון מהותיים
- שיחות "מה אם" וחקירת רעיונות חדשים

**מסמכים שמתוחזקים כאן:**
- README.md
- test_scenarios.md
- llm_prompts.md
- development_plan.md (זה)
- decisions.md (חדש — לוג החלטות)
- project_status.md (חדש — סטטוס שוטף)

**שאלות שמטופלות:**
- "האם להוסיף Layer חדש?"
- "כמה passes שווה להריץ?"
- "האם לעבור ל-AWS Israel עכשיו?"
- "מה עושים עם תרחיש שלא קיים בקטגוריות?"

**לא מטופל כאן:**
- כתיבת קוד
- spec ספציפי לסוכן
- עיצוב מסכים
- מחקר KB

**זרימת פלט:**
- → Chat 2 (PM): החלטות שדורשות יישום
- → Chat 3 (Designer): החלטות עיצוב מהותיות
- → Chat 6 (KB): מטלות מחקר

---

### Chat 2 — PM (ניהול ביצוע)

**הצ'ט הקריטי שמחבר בין החלטות לביצוע.**

**אחריות:**
- תרגום החלטות CEO ל-specs ביצועיים
- בדיקת עבודות הסוכנים (Claude Code, Codex, QA)
- ניהול sync בין סוכנים
- מעקב אחר spikes, blockers, dependencies
- אישור/החזרה של PRs

**מסמכים שמתוחזקים כאן:**
- specs/spike-XX.md — לכל spike, spec ביצועי מפורט

**זרימת קלט:**
- ← Chat 1 (CEO): "צריך להוסיף Rule 07"
- ← Chat 4 (Claude Code): "PR למעבר עליו"
- ← Chat 5 (Codex): "PR למעבר עליו"
- ← Chat 7 (QA): "Test results, regressions"

**זרימת פלט:**
- → Chat 4 (Claude Code): spec מפורט עם interfaces, edge cases, acceptance criteria
- → Chat 5 (Codex): אותו דבר עבור UI
- → Chat 7 (QA): "Spike X הושלם, צריך לבדוק"
- → Chat 1 (CEO): "Spike Y הושלם, פתוחות N שאלות"

**Skill ייעודי:** "PM Spec Format" — מבנה אחיד לכל spec.

**דוגמה מה PM נותן ל-Claude Code:**
```
=== Spike #08 — Rule 07 (Claimant Readiness Score) ===

Status: Ready for implementation
Owner: Claude Code

Inputs:
- claim object (Claim interface in types.ts)
- documents array
- rules engine context

Outputs:
- finding object if anomaly_level >= 'medium'
- 2-3 clarification_questions if anomaly_level >= 'low'
- readiness_score saved to claim.readiness_score

Files to create/modify:
1. /lib/pipeline/rules/r07_readiness.ts (new)
2. /lib/pipeline/rules/index.ts (add r07)
3. /lib/llm/prompts/narrative_consistency.ts (new — Prompt 06)
4. /lib/types.ts (add ReadinessScore interface)
5. /lib/pipeline/rules/__tests__/r07_readiness.test.ts (new)

Edge cases:
- Empty documents → score = null, skip rule
- Unknown profession → use default interpretation
- Score = 85 exactly → medium (lower bound)
- LLM call failure → fallback to score = null, log error

Acceptance criteria:
- All 4 dimensions calculated
- Interpretation Layer works per PROFESSION_RELEVANCE
- Tests pass on T10 (doctor), T16 (insurance ex), T26 (nurse)
- Output JSON matches types.ts

Dependencies:
- Spike #07 must be complete (rule engine framework)
- /kb/profession_relevance/taxonomy.json must exist (Chat 6)
```

---

### Chat 3 — Designer (UI/UX)

**אחראי על:**
- עיצוב מסכים (mockups, wireframes)
- Design system: צבעים, typography, components
- Hebrew RTL behavior
- Copy בעברית — ניסוח שאלות הבהרה, כפתורים, הודעות
- מסכים בריף, dashboard, claim view, pass timeline

**מסמכים שמתוחזקים כאן:**
- design_system.md — צבעים, פונטים, רכיבים
- screens/screen-XX.md — מפרט מסך עם wireframe
- copy_guide.md — סגנון כתיבה בעברית

**זרימת קלט:**
- ← Chat 1 (CEO): "צריך עיצוב למסך X"
- ← Chat 2 (PM): "Spike מוכן, חסר design spec"

**זרימת פלט:**
- → Chat 2 (PM): design specs מוכנים
- (PM מעביר ל-Codex)

**הערה:** Designer לא מדבר ישירות עם Codex. PM מתווך.

**Skill ייעודי:** "UI Design System" — צבעים, פונטים, RTL conventions.

---

### Chat 4 — Claude Code (Backend Builder)

**אחראי על ביצוע:**
- /inngest/, /lib/pipeline/, /lib/llm/, /lib/external/, /lib/storage/, /lib/kb/
- Database schema + migrations
- Background jobs
- כל ה-prompts

**זרימת קלט:**
- ← Chat 2 (PM): spec ביצועי מפורט

**זרימת פלט:**
- → Repo: PR
- → Chat 2 (PM): "PR מוכן לסקירה"

**Skill ייעודי:** "Backend Style Guide" — TypeScript conventions, prompts conventions.

---

### Chat 5 — Codex (Frontend Builder)

**אחראי על ביצוע:**
- /app/(intake)/, /app/(adjuster)/, /app/api/
- /components/
- Auth flow
- Tailwind + shadcn/ui

**זרימת קלט:**
- ← Chat 2 (PM): spec ביצועי + design spec (שהועבר מ-Designer)

**זרימת פלט:**
- → Repo: PR
- → Chat 2 (PM): "PR מוכן לסקירה"

**Skill ייעודי:** "UI Design System" — אותו skill של Designer.

---

### Chat 6 — KB Curator (Knowledge Research)

**אחראי על:**
- מחקר ואימות של ידע אמיתי
- פורמטי משטרה (15 מדינות יעד)
- מיילים רשמיים של תחנות
- Country corruption index
- Profession relevance taxonomy
- דוגמאות מאומתות של מסמכים אמיתיים

**מסמכים שמתוחזקים כאן:**
- research/police_formats_research.md — מקורות, אימותים, דוגמאות
- research/police_emails_research.md
- research/country_corruption_research.md
- research/profession_relevance_research.md

**זרימת קלט:**
- ← Chat 1 (CEO): "צריך פורמט משטרה לתאילנד עד סוף השבוע"

**זרימת פלט:**
- → Repo: commits ל-/kb/
- → Chat 2 (PM): "KB עודכן, ניתן להמשיך עם Spike X"

**Skill ייעודי:** "KB Verification Standards" — איך לאמת מקורות, רמת סמכות נדרשת.

---

### Chat 7 — QA & Testing

**אחראי על:**
- יצירת 31 תיקי דמה (test_scenarios.md → fixtures בפועל)
- ייצור מסמכים סינתטיים (PDFs, תמונות) לכל תרחיש
- בדיקת False Positive rate
- Regression analysis אחרי כל spike
- Acceptance testing מול ה-spec של PM

**מסמכים שמתוחזקים כאן:**
- test_results/spike-XX-results.md — תוצאות בדיקה לכל spike
- fixtures_log.md — מעקב אחר תיקי דמה שנוצרו
- regression_log.md — רשימה של regressions שזוהו

**זרימת קלט:**
- ← Chat 2 (PM): "Spike X הושלם, צריך לבדוק"

**זרימת פלט:**
- → Repo: /scripts/seed/, /test/fixtures/
- → Chat 2 (PM): test reports, bug reports

**Skill ייעודי:** "QA Test Case Format" — מבנה אחיד לתיקי דמה.

---

## 2. גישה הדרגתית — מתי כל צ'ט נפתח

לא צריך לפתוח את כל 7 הצ'טים ביום הראשון. הוסף לפי הצורך.

### שלב Foundation (Spikes 0-5) — 3 צ'טים

| צ'ט | סטטוס |
|---|---|
| Chat 1 — CEO | ✅ פעיל (זה הצ'ט הנוכחי) |
| Chat 2 — PM | ✅ פעיל |
| Chat 4 — Claude Code | ✅ פעיל |
| Chat 3 — Designer | ⏸ לא נדרש עדיין |
| Chat 5 — Codex | ⏸ לא נדרש עדיין |
| Chat 6 — KB | ⏸ לא נדרש עדיין |
| Chat 7 — QA | ⏸ לא נדרש עדיין |

**במה מתמקדים:**
- Foundation: schema, types, Azure OCR, ראשון prompts
- כל זה Backend בלבד

**Spikes 0, 0a, 3:** Claude Code עובד.
**Spikes 1, 2:** דורשים UI (Auth + Upload), אבל אפשר להשהות אותם או לבנות UI מינימלי גנרי שאת לא תכננת בעיצוב מקצועי. **המלצה:** לדחות אותם לשלב הבא.

### שלב Mid (Spikes 6-15) — 5 צ'טים

| צ'ט | סטטוס |
|---|---|
| Chat 1 — CEO | ✅ פעיל |
| Chat 2 — PM | ✅ פעיל |
| Chat 3 — Designer | ✅ **מצטרף** |
| Chat 4 — Claude Code | ✅ פעיל |
| Chat 5 — Codex | ✅ **מצטרף** |
| Chat 6 — KB | ⏸ לא נדרש עדיין |
| Chat 7 — QA | ⏸ לא נדרש עדיין |

**במה מתמקדים:**
- Pipeline המלא: 9 כללים, layers, iterative
- מקבילית מתחילה עם UI (Auth, Upload, Brief View)

**מה Designer עושה:** Chat 3 מתחיל בעיצוב 4 מסכים ראשונים.
**מה Codex עושה:** Chat 5 בונה את המסכים לפי הspec.

### שלב Pre-Demo (Spikes 16-22) — 6 צ'טים

| צ'ט | סטטוס |
|---|---|
| Chat 1 — CEO | ✅ פעיל |
| Chat 2 — PM | ✅ פעיל |
| Chat 3 — Designer | ✅ פעיל |
| Chat 4 — Claude Code | ✅ פעיל |
| Chat 5 — Codex | ✅ פעיל |
| Chat 6 — KB | ✅ **מצטרף** |
| Chat 7 — QA | ⏸ לא נדרש עדיין |

**מה KB עושה:** Chat 6 מתחיל למלא את `/kb/` בידע מאומת — תחילה 3 מדינות לפורמטי משטרה, ואז להמשיך לשאר.

### שלב Demo Prep (Spikes 23-26) — 7 צ'טים

| צ'ט | סטטוס |
|---|---|
| Chat 1 — CEO | ✅ פעיל |
| Chat 2 — PM | ✅ פעיל |
| Chat 3 — Designer | ✅ פעיל |
| Chat 4 — Claude Code | ✅ פעיל |
| Chat 5 — Codex | ✅ פעיל |
| Chat 6 — KB | ✅ פעיל |
| Chat 7 — QA | ✅ **מצטרף** |

**מה QA עושה:** Chat 7 בונה את 31 תיקי הדמה, מסמכים סינתטיים, ובודק regression.

---

## 3. זרימת מידע — מי מדבר עם מי

```
                       ┌──────────────┐
                       │   CHAT 1     │
                       │     CEO      │
                       └───────┬──────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ CHAT 2   │    │ CHAT 3   │    │ CHAT 6   │
        │   PM     │◄───│ Designer │    │   KB     │
        │          │    │          │    │ Curator  │
        └────┬─────┘    └──────────┘    └─────┬────┘
             │                                 │
   ┌─────────┼──────────┬──────────┐          │
   ▼         ▼          ▼          ▼          │
┌───────┐ ┌───────┐ ┌───────┐                 │
│CHAT 4 │ │CHAT 5 │ │CHAT 7 │                 │
│Claude │ │ Codex │ │  QA   │                 │
│ Code  │ │       │ │       │                 │
└───┬───┘ └───┬───┘ └───┬───┘                 │
    │         │         │                      │
    └─────────┴─────────┴──────────────────────┘
                       │
                       ▼
                   Repository
                    (GitHub)
                       │
                       ▼
                  Vercel deploy
                       │
                       ▼
                  בדיקה ידנית
```

### תקשורת בין צ'טים — איך בפועל

צ'טים לא מדברים אחד עם השני אוטומטית. **אתה מתווך כל העברה.**

**דוגמה:** CEO החליט להוסיף Rule 09.
1. אתה ב-Chat 1: "החלטה — להוסיף Rule 09. סיכום במסמך decisions.md."
2. אתה עובר ל-Chat 2: "PM, מעבירים לך החלטה: להוסיף Rule 09. הקשר: [העתק מ-Chat 1]. תכין spec ביצועי."
3. PM ב-Chat 2 מייצר spec, אומר: "spec מוכן."
4. אתה עובר ל-Chat 4: "Claude Code, יש לך משימה חדשה. spec: [העתק מ-Chat 2]."
5. Claude Code עובד, מסיים.
6. אתה עובר ל-Chat 2: "PR מוכן. סקור."
7. PM סוקר, אומר: "approved" או "תיקונים נדרשים."
8. אם approved → אתה עובר ל-Chat 7: "QA, צריך לבדוק את Rule 09."

**זה דורש משמעת ועקביות.** אבל זה הכרחי כדי לשמור על הקשרים נקיים.

### Skill קבוע: "Cross-chat Reference Format"

ב-`development_plan.md` (זה), הוספת skill מומלצת לכל הצ'טים שמייצרים פלט:

```markdown
# Cross-chat Reference Format

כשמעבירים מידע מצ'ט אחד לאחר, השתמש במבנה:

=== TRANSFER FROM [CHAT NAME] ===
Date: YYYY-MM-DD
From chat: [chat 1 name]
To chat: [chat 2 name]
Type: [decision | spec | bug_report | review_request | other]

Context:
[רקע קצר]

Content:
[התוכן עצמו]

Action requested:
[מה רוצים שהצ'ט המקבל יעשה]

Reference:
[קישור / ציטוט מקור]
=== END TRANSFER ===
```

זה מבנה שמקל על הסוכן המקבל להבין מה הוא צריך לעשות.

---

## 4. מסמכים מתחזקים — בנוסף ל-4 הקיימים

### `decisions.md` (חדש)

**איפה:** Project Knowledge ב-Claude.ai.

**מה זה:** לוג של כל החלטה אסטרטגית. נכתב ב-Chat 1 (CEO).

**למה זה קריטי:** 6 שבועות מהיום, לא תזכור למה החלטת לא להוסיף Layer 7. הלוג שומר על קוהרנטיות.

**פורמט:**
```markdown
## D-001: לא להוסיף Layer 7 ב-POC הראשון
Date: 2025-XX-XX
Status: Active
Context: שיחה על הוספת live capture + GPS verification
Decision: דחיית Layer 7 ל-V1.5
Reasoning:
- DPIA + עו"ד פרטיות חובה לפני (30-60K ₪)
- מצריך PWA mobile-first מלא
- חלק מהמידע לא נגיש מ-browser
- הדרת אוכלוסיות שלא מסכימות
Trade-offs accepted:
- מתקבלת מערכת פחות עוצמתית בגרסה ראשונה
- חלק מתרחישי T04 לא ייתפסו
Revisit when: יש מבטח שמסכים לפיילוט
```

### `project_status.md` (חדש)

**איפה:** Project Knowledge ב-Claude.ai. **מתעדכן אחרי כל spike.**

**מה זה:** ה-single source of truth לסטטוס הפרויקט.

**למה זה קריטי:** מי שמתחיל סשן חדש (אתה אחרי הפסקה, או סוכן שצריך הקשר) — קורא אותו ויודע איפה אנחנו.

**פורמט:**
```markdown
# Project Status

Last updated: 2025-XX-XX HH:MM
Current phase: Foundation / Mid / Pre-Demo / Demo Prep
Active chats: [list]

## Current sprint
Spike: #X — [name]
Owner: Claude Code
Status: in_progress / ready_for_review / blocked
Started: 2025-XX-XX
ETA: 2025-XX-XX

## Pending sync
Items waiting between agents:
- [ ] /lib/types.ts updated with ReadinessScore — Codex needs to know
- [ ] /kb/police_formats/thailand.json done — Pipeline ready to use

## Blocked
- Nothing currently / [list of blockers]

## Recent completions
- Spike #07: Rule engine framework (2025-XX-XX)
- Spike #08: Rule 07 Readiness Score (2025-XX-XX)

## Last decision
Reference: D-014 in decisions.md

## KPIs
- Completed spikes: 8 / 26
- Demo claims working end-to-end: 2 / 31
- False positive rate: 8%
- Average LLM cost per claim: $0.42
```

זה מסמך חי. CEO מעדכן אותו, או נותן ל-PM לעדכן.

---

## 5. Skills מומלצים — סיכום

**הערה (D-008):** כל ה-Skills למטה **דחויים** — נכון לעכשיו, ההוראות מוטמעות ב-System Prompt של כל צ'ט (ראה Welcome Messages). הסעיף נשמר כתיעוד התכנון המקורי וכבסיס לשיחזור עתידי אם D-008 יחזור לדיון.

| # | שם | תוכן | משמש ב-Chats |
|---|---|---|---|
| 1 | Backend Style Guide | TypeScript, prompts, logging | 4 (Claude Code), 1 (CEO לזמן בקרה) |
| 2 | UI Design System | Hebrew RTL, colors, copy | 3 (Designer), 5 (Codex) |
| 3 | PM Spec Format | מבנה אחיד ל-spike spec | 2 (PM) |
| 4 | KB Verification Standards | איך לאמת מקורות | 6 (KB) |
| 5 | QA Test Case Format | מבנה אחיד לתיקי דמה | 7 (QA) |
| 6 | Cross-chat Reference Format | פורמט העברה בין צ'טים | כל הצ'טים |

---

## 6. חלוקת אחריות — Claude Code vs Codex

(זהה לגרסה הקודמת — חלוקה לפי גבולות אחריות, גבולות נוקשים על תיקיות, `/lib/types.ts` כ-contract.)

### Claude Code — Backend Layer

- /inngest/, /lib/pipeline/, /lib/llm/, /lib/external/, /lib/storage/, /lib/kb/
- /scripts/

### Codex — Frontend Layer

- /app/(intake)/, /app/(adjuster)/, /app/api/
- /components/
- Auth, Tailwind, shadcn/ui

### גבולות נוקשים

- Claude Code לא נוגע ב-`/app/(intake)/`, `/app/(adjuster)/`, `/components/`
- Codex לא נוגע ב-`/inngest/`, `/lib/pipeline/`, `/lib/llm/`, `/lib/external/`, `/lib/kb/`
- שניהם קוראים מ-`/lib/types.ts`. **רק Claude Code מעדכן.**

---

## 7. Knowledge Base — שני מקומות

### מקום 1: Project Knowledge ב-Claude.ai

מסמכי תכנון עליונים שכל הצ'טים צריכים לראות:
- README.md
- test_scenarios.md
- llm_prompts.md
- development_plan.md (זה)
- **decisions.md** (חדש)
- **project_status.md** (חדש)

### מקום 2: `/kb/` בתוך ה-repo

ידע מאומת ש**המערכת בפועל** משתמשת בו.

```
/kb/
  /police_formats/
    _README.md, _schema.json
    thailand.json, greece.json, cyprus.json, ...
    
  /police_emails/
    directory.json
    verification_log.json
    
  /country_corruption/
    index.json
    sources.md
    
  /verified_examples/
    /police_reports/
    /receipts/
    /medical_docs/
    
  /profession_relevance/
    taxonomy.json
    
  /product_rules/    # V2
```

**מתחזקים ע"י:** Chat 6 (KB Curator) → commits ישירות ל-repo.

---

## 8. Spike Allocation — מי בונה מה

עדכון של רשימת ה-spikes מ-README.md, עם הקצאה לסוכן.

### שלב 1 — Foundation (שבועיים)

| # | משימה | סוכן | תלוי ב |
|---|---|---|---|
| 0 | Project setup, Supabase, schema, Inngest | Claude Code | — |
| 0a | `/lib/types.ts` initial creation | Claude Code | 0 |
| 1 | Auth setup (Supabase Auth) | Codex | 0a |
| 2 | Upload form (basic) | Codex | 1 |
| 3 | Document processing via Claude (OCR + extraction unified) | Claude Code | 0 |

### שלב 2 — Document Processing (שבוע)

| # | משימה | סוכן | תלוי ב |
|---|---|---|---|
| 4 | Prompt 01-05 implementation | Claude Code | 3 |
| 5 | Document type classification flow | Claude Code | 4 |

### שלב 3 — Rules + Layers (שבועיים)

| # | משימה | סוכן | תלוי ב |
|---|---|---|---|
| 6 | Layer 0 + Layer 0.5 | Claude Code | 4 |
| 7 | Rule engine framework | Claude Code | 6 |
| 8 | r01, r02, r03 + KB police_formats (3 countries) | Claude Code + KB Chat | 7 |
| 9 | r04, r05, r06, r07, r08, r09 | Claude Code | 8 |
| 10 | Layer 5 (Severity Adjustment) | Claude Code | 9 |

### שלב 4 — Iterative Pipeline (שבוע)

| # | משימה | סוכן | תלוי ב |
|---|---|---|---|
| 11 | Inngest workflows + pass orchestration | Claude Code | 10 |
| 12 | Gap Identifier (deterministic + LLM) | Claude Code | 11 |
| 13 | External APIs (currency, places, IP) + caching | Claude Code | 11 |

### שלב 5 — Brief + Single Claim UI (שבועיים)

| # | משימה | סוכן | תלוי ב |
|---|---|---|---|
| 14 | Prompt 09 (Brief Generator) | Claude Code | 12 |
| 15 | Investigation Brief View screen | Codex | 14 |
| 16 | Pass Timeline screen | Codex | 15 |
| 17 | Documents tab + Audit log tab | Codex | 15 |

### שלב 6 — Validation (שבוע)

| # | משימה | סוכן | תלוי ב |
|---|---|---|---|
| 18 | תיק החבר — בדיקה end-to-end | QA Chat + ידני | 17 |
| 19 | תיקונים | Claude Code + Codex | 18 |

### שלב 7 — Dashboard + Demo (שבועיים)

| # | משימה | סוכן | תלוי ב |
|---|---|---|---|
| 20 | Dashboard ראשי (Queue) | Codex | 17 |
| 21 | מסננים, מיון, חיפוש | Codex | 20 |
| 22 | מסך תור שאלות הבהרה | Codex | 20 |
| 23 | בניית 5 תיקי דמה ראשונים | QA Chat | 19 |
| 24 | הוספת 25 תיקי דמה + טיפול ב-FP | QA Chat + Claude Code | 23 |
| 25 | UI polish | Codex | 24 |
| 26 | Demo deck | אתה (CEO Chat) | 25 |

**סך הכל:** 9-10 שבועות במקביל.

---

## 9. הכנות לפני Spike 0

### חשבונות לפתיחה

1. **GitHub** — repo `claim-investigator-poc`
2. **Vercel** — vercel.com → connect GitHub
3. **Supabase** — supabase.com → New Project (Frankfurt region)
4. **Anthropic** — console.anthropic.com → API key (גם ל-LLM וגם ל-OCR/extraction)
5. **Inngest** — inngest.com → New App
6. **ExchangeRate-API** — free tier
7. **Google Places** — console.cloud.google.com
8. **IPdata** — לגיאו-IP

**8 חשבונות.** Azure DocIntel דחוי ל-V2 (החלטה D-007).

### Skills ב-Claude.ai (Settings → Skills)

**דחוי לפי D-008.** במקום זה, ההוראות מוטמעות ב-Welcome Message של כל צ'ט (ראה chat2_pm_welcome.md, chat4_claudecode_welcome.md, chat3_designer_welcome.md).

### Project Knowledge ב-Claude.ai

העלה 6 מסמכים:
1. README.md
2. test_scenarios.md
3. llm_prompts.md
4. development_plan.md (זה)
5. decisions.md (התחלה ריק או עם החלטות שכבר נעשו)
6. project_status.md (התחלה ריק)

### Chats לפתיחה

**ביום הראשון — 2 צ'טים:**
- Chat 2 — PM
- Chat 4 — Claude Code

**Chat 1 — CEO** = הצ'ט הנוכחי, נשאר.

**שאר 4 הצ'טים** — ייפתחו לפי הצורך לפי השלב (סעיף 2).

### Tooling מקומי

- Node.js 20+
- pnpm
- VS Code
- Claude Code CLI
- Codex CLI

---

## 10. KPIs לניהול הפרויקט

| מדד | יעד | מי מודד |
|---|---|---|
| כמות spikes שהושלמו השבוע | 2-3 | PM ב-`project_status.md` |
| כמות תיקי דמה שעובדים end-to-end | יעד 31 | QA |
| False Positive rate | <15% | QA |
| כמות איטרציות ל-prompt עד יציבות | <5 | PM |
| עלות LLM ממוצעת לתיק | <$0.50 | PM |
| coverage של 9 הכללים בבדיקות | 100% | QA |

---

## 11. נקודות סיכון ידועות

1. **Inngest cold start** — pre-warm במקרה הצורך.
2. **Cost explosion ב-iterative loop** — Cost cap + monitoring חובה.
3. **Codex לא מסונכרן ל-types.ts** — נוהל קפדני.
4. **Hebrew/RTL bugs ב-PDF rendering** — בדיקה מוקדמת.
5. **Claude OCR איכות בעברית** — אם נתקלים בקבלות עם איכות OCR נמוכה, fallback ל-Azure DocIntel (החלטה D-007).
6. **תיקים שלא מסתיימים** — auto-close אחרי 30 ימים.
7. **Context overflow בצ'טים** — עם הזמן צ'טים מתמלאים. **פתרון:** סגור צ'ט ופתח חדש כששיחה מתארכת. סכם תחילה ב-`project_status.md` כדי שלא תאבד הקשר.

---

## 12. הצעד המיידי — מה לעשות היום

1. **הצ'ט הזה (Chat 1):** סיים תכנון. עבור על המסמכים. אשר.
2. **צור decisions.md ו-project_status.md** — מסמכים ריקים בתחילה.
3. **פתח חשבונות** — 9 חשבונות מסעיף 9.
4. **Welcome Messages לצ'טים** — ההוראות מוטמעות ב-Welcome Message של כל צ'ט (D-008). הקבצים מוכנים: chat2_pm_welcome.md, chat4_claudecode_welcome.md.
5. **העלה ל-Project Knowledge** — 6 המסמכים.
6. **פתח Chat 2 (PM)** — הזן את ה-skill של PM, שלח לו את ה-spec של Spike 0 לעיבוד.
7. **PM ייצר spec מפורט.** אתה לוקח אותו ופותח את **Chat 4 (Claude Code).**
8. **Claude Code מתחיל לעבוד על Spike 0.**

תוך יום-יומיים: יש לך פרויקט Next.js פעיל עם schema, types.ts, ו-Inngest מוכנים.
