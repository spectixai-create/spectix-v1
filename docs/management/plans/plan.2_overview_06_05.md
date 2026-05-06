# Spectix - תכנית ביצוע ברמת מבט-על (iteration 2)

**תאריך:** 06/05/2026
**גרסה:** plan.2 (iteration 2)
**Predecessor:** plan.1 (iteration 1) - עודכן מאחר ש-SPRINT-002C נמסר ו-D-019 collision גילתה drift גדול בין תכנון לביצוע.

---

## בוצע ✅

| #         | שכבה                                                         | מקור-אימות בריפו   |
| --------- | ------------------------------------------------------------ | ------------------ |
| 1         | תשתית: Auth, UI skeletons, schema, intake form               | PRs #1-#10, main   |
| 2         | העלאת מסמכים + Storage                                       | PR #11             |
| 3         | Pipeline (Inngest + processing_status lifecycle)             | PR #13             |
| 4         | סיווג רחב (Prompt 01) - 8 broad types                        | PRs #14, #15       |
| 5         | סיווג subtype (Prompt 01b) - 37 subtypes                     | PR #16             |
| 6         | 4 broad extraction prompts (receipt, police, hotel, medical) | PR #18             |
| 7         | Pass lifecycle completion fix                                | PR #38             |
| 8         | Normalized extraction contracts (schema-first)               | PR #50             |
| 9         | 7 dedicated normalized extraction routes (priority MVP)      | PR #52             |
| 10        | Documentation post-merge retro                               | PR #56             |
| 11.1-11.3 | **Validation layers (name_match, dates, currency)**          | **PR #60** ⭐ NEW  |
| 12        | Documentation sync (CURRENT_STATE, DECISIONS, TECH_DEBT)     | PR #63 (SYNC-001)  |
| 13        | Audit findings (PR #60 vs design001.6)                       | PR #62 (AUDIT-001) |
| 14        | Management folder structure                                  | PR #61 (SYNC-002)  |

main HEAD: `9bae49f79d02140513ccd537fdcbba35f2a360bf`

---

## בעבודה 🔧

### SPRINT-002D — Pre-synthesis prerequisites

**מצב:** approved v1.1, ממתין ל-Codex dispatch ע"י CEO GPT.
**Scope:** errored state + admin recovery + soft cost cap.
**Spec:** `docs/management/sprints/sprint002d.2_errored_costcap_06_05.md`
**הערכה:** 3-4 ימי Codex.
**Decisions added:** D-027 (event/pass-driven canonical), D-028 (002D scope).

### DESIGN-002 — Synthesis decomposition

**מצב:** iteration 3 (v1.2) self-audited, ממתין ל-Architect review.
**Spec:** `docs/management/designs/design002.3_synthesis_decomposition_06_05.md`
**7 החלטות סגורות:** trigger=event-driven, schema=single jsonb table, no rules engine in MVP, MVP scope minimal, finding categories+severity, structured questions, severity-weighted score.

### DESIGN-001 — State machine spec

**מצב:** iteration 7 (v1.6) - revision מהותית per D-027.
**Spec:** `docs/management/designs/design001.7_state_machine_06_05.md`
**שינוי מ-v1.5:** event/pass-driven canonical במקום fine-grained 11-state vocabulary.

---

## נשאר לביצוע ❌

### 15. SPRINT-003A — Synthesis MVP (הצעד הבא בעדיפות)

**Spec:** `docs/management/sprints/sprint003a.1_synthesis_mvp_06_05.md` (READY)
**Preconditions:** SPRINT-002D shipped + design002.3 sign-off.
**Scope:**

- Migration `synthesis_results` table
- Inngest handler `run-synthesis-pass`
- Deterministic findings derivation מ-claim_validations
- Question generation per finding template table
- Readiness score (severity-weighted, 0-100)
- 25 unit tests + 3 integration tests

**הערכה:** ~1 שבוע Codex.

### 16. SPRINT-UI-001 — Adjuster Brief View MVP (במקביל ל-003A או אחריו)

- 16.1 Brief view: synthesis results + findings + questions + score
- 16.2 Pass timeline visualization
- 16.3 Documents tab עם validation results
- 16.4 Audit log tab
- **Preconditions:** SPRINT-003A spec ready (סיכום שדות UI יקרא).
- **Spec:** טרם נכתב. נדרש DESIGN-003 קצר לפני implementation.

### 17. SPRINT-003B/C/D — Synthesis enrichment (CONDITIONAL)

**Trigger:** Pilot evidence מצביע על ערך.

- 17.1 SPRINT-003B: Rules engine framework + R01/R05/R08 (deterministic)
- 17.2 SPRINT-003C: LLM-shaped rules R04/R09 (cost cap protects)
- 17.3 SPRINT-003D: Readiness score refinement עם rule inputs

### 18. שכבות validation נוספות (deferred)

- 18.1 Layer 11.4 authenticity (נדחה מ-002C)
- 18.2 Layer 11.5 anomaly detection (נדחה מ-002C)
- **Trigger:** Pilot evidence; חלק מ-V2.

### 19. Knowledge Base (`/kb/` בריפו) - חלקי

- 19.1 Police formats per country (3 ראשונות בתכנית)
- 19.2 Hotel format catalog
- 19.3 Reference data
- **Status:** Deferred. Required only when SPRINT-003B implements R03 (police format match).

### 20. QA + Test fixtures

- 20.1 Synthetic fixtures (9/31 קיימים)
- 20.2 22 fixtures נוספים ל-31 התרחישים
- 20.3 Regression suite
- 20.4 End-to-end validation pass with synthesis output

### 21. Production hardening (per D-023, אחרי LOI)

- 21.1 Data residency migration (AWS Israel)
- 21.2 DPIA + RBAC
- 21.3 Monitoring/alerting
- 21.4 Backup/DR procedures
- 21.5 Virus scanning
- 21.6 Service_role rotation
- 21.7 שאר items מ-`docs/TECH_DEBT.md`

### 22. Customer Discovery (Track 2, owner = User)

- 22.1 5 שיחות עם מבטחי טראוול ישראלים
- 22.2 ולידציה של D-001 / D-002 / D-006
- **Goal:** LOI חתום → SPRINT-PROD-BLOCK יוצא לפועל.

---

## רצף Critical Path ל-Demo

```
[NOW]
  ↓
SPRINT-002D       (Codex, 3-4 days)
  ↓
SPRINT-003A       (Codex, ~1 week)
  ↓ (parallel)
SPRINT-UI-001     (Codex, ~1 week)
  ↓
[DEMO READY]      (per D-023)
```

**הערכה:** ~3 שבועות מ-NOW ל-DEMO READY.

---

## רצף ל-Pilot Ready (מותנה ב-LOI)

```
[DEMO READY]
  ↓
[Customer discovery → LOI signed]   (User track, parallel, independent)
  ↓
SPRINT-PROD-BLOCK    (4-6 weeks)
SPRINT-RESIDENCY     (4-6 weeks, may run parallel)
  ↓
[PILOT READY]
```

---

## שאלות פתוחות (סטטוס מעודכן)

### CLOSED

- ~~Q17.1 (7 routes נוספים מ-#03ד-2):~~ ✅ Closed via D-022 (skip, broad_fallback מספיק).
- ~~Q17.2 (קריטריון demo):~~ ✅ Closed via D-023 (synthesis MVP + UI MVP = demo; +hardening +LOI = pilot).
- ~~Q17.3 (UI adjuster ב-MVP):~~ ✅ Closed via D-023 (YES, חלק מ-demo).

### NEW (post-AUDIT-001)

- Q18.1 (fine-grained state vocabulary): per D-027 deferred to V2. Trigger to revisit = UI/pilot evidence.
- Q18.2 (rules engine in MVP): per design002.3 Decision 3, NO. Rules in 003B+ conditional.
- Q18.3 (LLM rules R04/R09): per design002.3, deferred to 003C+ conditional on pilot.

---

## החלטות מפתח (D-001 - D-028)

**D-001 - D-019:** קיימות ב-`docs/DECISIONS.md` (כולל D-019 = sprint methodology, PR #51).

**D-020 - D-026:** מתווספות ב-PR #63 (SYNC-001):

- D-020: Single-pass MVP, supersedes D-004
- D-021: 3-chat operating structure, supersedes D-005
- D-022: Skip 7 additional routes
- D-023: Production hardening conditional on LOI
- D-024: pass_number semantics
- D-025: extracting state removed
- D-026: errored state distinct from rejected

**D-027 - D-028:** יתווספו ב-SPRINT-002D PR:

- D-027: Backend lifecycle canonical = event/pass-driven
- D-028: SPRINT-002D scope minimal

---

## תיקיית ניהול (`docs/management/`)

PR #61 הוסיף את התיקייה. בנייה משתמש בה לכל artifact עתידי.

**מבנה:**

```
docs/management/
├── README.md
├── plans/         ← plan.1 (זה plan.2 יוסף)
├── designs/       ← design001.6 (יעבור ל-archive), design001.7 (חדש), design002.1-002.3
├── sprints/       ← s11.1-11.3.4 (PR #60), sprint002d.2 (חדש), sprint003a.1 (חדש)
├── audits/        ← audit001.1, audit001.2 (PR #62)
├── sync/          ← sync001.1 (PR #63), sync002.1 (PR #61), sync003.1 (חדש)
└── archive/       ← decisions.1, diag001, merge001, smoke005
```

**SYNC-003** יעלה את הקבצים החדשים שנכתבו offline:

- design001.7, design002.3, sprint002d.2, sprint003a.1, plan.2, sync003.1

---

## משימות לעצמאיות (User track)

1. **Customer Discovery (highest leverage):** 5 שיחות עם adjusters/managers במבטחי טראוול ישראלים. גם 2-3 שיחות = signal משמעותי.
2. **Demo prep:** הכנת 2-3 תיקי דמה אופטימליים ל-pitch (אחרי DEMO READY).
3. **Pricing exploration:** מחקר $$ לפי תיק - מה מבטחים משלמים היום על חקירה מקבילה?

---

## Version

plan_overview — iteration 2 — 06/05/2026
**Filename:** `plan.2_overview_06_05.md`
**Predecessor:** plan.1 (iteration 1) — outdated post PR #60.
**Next iteration triggers:** SPRINT-002D ships → plan.3. Or SPRINT-003A ships → plan.3.
