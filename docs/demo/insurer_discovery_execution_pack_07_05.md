# Insurer Discovery Execution Pack

**Date:** 2026-05-07

**Status:** Ready for CEO/operator review. This document prepares execution; it
does not contact insurers.

**Input state:** Real-case tuning round 1 returned READY in
`docs/management/reports/real_case_tuning_round_1_report_07_05.md`.

---

## Objective

Start insurer discovery and demo conversations after READY validation.

Primary goal: 5 conversations with Israeli travel-insurance stakeholders.

Trigger to SPRINT-PROD-BLOCK: first signed LOI or equivalent written pilot
intent from an insurer.

This is a manual/operator-led workflow. No repo automation, email send,
CRM action, Supabase mutation, smoke, deploy, or production action is approved
by this document.

## Target ICP

Primary targets:

- Israeli travel insurers.
- Travel claims operations leaders.
- Claims innovation / digital claims stakeholders.
- SIU or fraud-triage leaders when they influence travel claims workflow.

Secondary targets:

- Claims service leaders who own claimant communication.
- Technology or data leaders who support claims operations.

Exclude:

- Brokers-only conversations unless the broker can directly connect Spectix to
  insurer claims teams.
- Generic insurtech conversations without travel-claims ownership.

## Outreach Sequence

### Step 1 - Initial Hebrew Email Or LinkedIn Message

Use a short factual message based on
`docs/demo/ui002b_outreach_email_he.md`.

Keep the message direct:

- Spectix helps adjusters review travel insurance claim files.
- Spectix surfaces missing or contradictory information.
- Spectix supports the missing-information loop with a claimant response link.
- Spectix does not make automatic claim decisions.
- Ask for a 20-minute discovery/demo call.

Avoid:

- Inflated fraud-detection claims.
- Promising production readiness.
- Claiming automated decisioning.
- Mentioning real customer data or production deployment.

### Step 2 - Follow-Up After 3-5 Business Days

Suggested Hebrew follow-up:

```text
שלום,

רק מקפיץ בעדינות את ההודעה הקודמת.

המטרה היא להבין האם תהליך השלמת מידע חסר בתביעות נסיעות הוא כאב אמיתי אצלכם,
ולהראות הדגמה קצרה על נתונים סינתטיים בלבד.

אם זה רלוונטי, אשמח ל-20 דקות השבוע או בשבוע הבא.
```

### Step 3 - Request 20-Minute Demo / Discovery Call

If there is interest, ask for:

- 20 minutes.
- One claims/operations owner.
- Permission to use synthetic demo data only.
- Agreement that the conversation is discovery, not procurement commitment.

Positioning:

- Spectix is claim-file triage and missing-information workflow support.
- Spectix is not an automatic decision-maker.
- The pilot path starts in non-production / sandbox only.

## Demo Script - 20 Minutes

### 1. Problem Framing - 2 Minutes

- Travel claim files often include multiple documents, missing context, and
  small inconsistencies.
- Adjusters spend time preparing the file before they can decide.
- Spectix aims to organize that prep work and claimant follow-up loop.

### 2. Synthetic Travel Claim Walkthrough - 3 Minutes

- Open a synthetic claim from the validation report.
- State that all data is synthetic.
- Do not show raw documents with PII.
- Do not show secrets, terminal windows, database credentials, raw tokens, or
  full claimant links.

### 3. Adjuster Brief - 3 Minutes

- Show the claim header, status, risk/readiness context, findings, validation,
  and documents.
- Explain that the adjuster remains the decision-maker.
- Emphasize readable, actionable summaries over black-box scoring.

### 4. Missing-Info Questions - 3 Minutes

- Show generated questions for missing document, date mismatch, currency
  mismatch, name mismatch, or low-confidence cases.
- Ask whether these questions match how their adjusters ask for information
  today.

### 5. Claimant Response Link And Email / Manual Fallback - 3 Minutes

- Dispatch questions from the adjuster view.
- Show that the claimant link remains visible for manual sharing.
- Explain current behavior:
  - if claimant email exists, Spectix can send the email notification;
  - manual link sharing remains available;
  - if email is missing or clipboard copy is blocked, the operator can copy
    manually from the read-only link field.
- Do not show a browser URL containing a full token in recordings or
  screenshots.

### 6. Audit And Safety Boundaries - 2 Minutes

- Show audit trail as event metadata only.
- Explain that raw tokens, token hashes, full magic links, claimant answer
  content, and secrets are not used as demo evidence.
- State that production hardening is a separate gate.

### 7. Discovery Questions - 3 Minutes

Use the questions in this pack and
`docs/demo/ui002b_customer_discovery_questions.md`.

### 8. Next Step / LOI Ask - 1 Minute

Ask:

- Is this workflow painful enough to pilot?
- Who owns a pilot decision?
- What data/security condition would block a pilot?
- What would need to be true for written pilot intent or LOI?

## Discovery Questions

### Claim Volume

- How many travel claims per month are in the ₪5,000-₪15,000 range?
- Which travel claim types are most common?
- Which claim types require the most manual review?
- How many claims per month include missing or contradictory information?

### Manual Review Pain

- Which review steps are repetitive enough that software support would matter?
- How long does an adjuster spend preparing a claim brief today?
- Where do claims wait the longest before an adjuster can decide?
- Which inconsistencies are easiest to miss?

### Missing Information Workflow

- How often do adjusters request missing documents or clarifications?
- How is that request sent today?
- Who sends the request today?
- What percentage of claims get delayed because claimant responses are
  incomplete?
- What makes a claimant response unusable?

### Communication With Claimants

- Which channels are used today: email, SMS, WhatsApp, phone, portal, broker?
- Is email acceptable for a first pilot?
- When does an adjuster manually resend or clarify a request?
- Who owns claimant follow-up when the claimant does not respond?

### Fraud / SIU Triage Needs

- Which fraud or inflation signals are useful today?
- Which signals create too many false positives?
- What should route to SIU instead of normal claims handling?
- Where should Spectix stop and leave judgment to the adjuster?

### Security / Procurement Blockers

- What data/security condition would block a pilot?
- Is data residency in Israel required for pilot, production, or both?
- Is DPIA or legal review required before a sandbox pilot?
- Are synthetic or anonymized files acceptable for early evaluation?
- What vendor security process is required for claims data?

### Pilot Success Criteria

- What would make a 30-60 day pilot successful?
- Which metric matters most: cycle time, adjuster productivity, fewer
  back-and-forth loops, fraud triage, or customer experience?
- How many claims are enough for a meaningful pilot?
- What would make the pilot fail?

### Budget / Owner / Timeline

- Who owns budget for claims operations tools?
- Who would approve a pilot?
- Who must review this before written pilot intent?
- What timeline is realistic for a pilot decision?

## Evidence Allowed During Demo

Allowed:

- Synthetic cases from
  `docs/management/reports/real_case_tuning_round_1_report_07_05.md`.
- Non-secret claim IDs.
- PASS/FAIL summaries.
- Masked safe test email.
- Screenshots without tokens, full links, PII, secrets, or production data.
- Sanitized status/count evidence.

Forbidden:

- Real claimant data.
- Raw documents.
- Full magic links.
- Raw tokens.
- Token hashes.
- Secrets.
- JWTs or auth headers.
- Production data.
- Email body content containing claimant links.

## LOI / Pilot Qualification Criteria

A qualified next step should include:

- Named business owner.
- Clear claims workflow pain.
- Agreement to review a sanitized demo or sandbox flow.
- Security/procurement path identified.
- Written pilot interest, LOI, or email confirmation.
- Pilot scope starts in non-production / sandbox first.
- Business owner can identify success criteria and approximate claim volume.

Do not treat a conversation as LOI-qualified if:

- there is no named owner;
- the pain is theoretical;
- they only want a broad vendor intro;
- production access is requested before a production-readiness gate;
- they require unsupported SMS/WhatsApp/Twilio automation as a prerequisite.

## Operator Checklist

### Before Call

- Use only synthetic demo data.
- If doing a live demo, verify staging health separately only if explicitly
  approved; do not run smoke unless separately approved.
- Hide browser URLs that contain claimant tokens.
- Do not use production data.
- Do not show terminal windows with secrets.
- Prepare the short demo script and relevant screenshots.
- Prepare the Hebrew outreach context and discovery questions.
- Confirm no automatic email outreach is being triggered from the repo.

### During Call

- Record pain points.
- Record monthly travel claim volume and relevant claim range.
- Do not promise production readiness.
- Do not promise automatic fraud decisions.
- Do not promise SMS, WhatsApp, Twilio, or OpenClaw automation.
- Capture objections in the prospect's language.
- Ask who owns pilot approval.
- Ask what would be needed for written pilot intent.

### After Call

- Log discovery notes outside this repo unless a docs update is explicitly
  requested.
- Classify lead:
  - cold;
  - interested;
  - pilot candidate;
  - LOI candidate.
- Define next action:
  - no follow-up;
  - send sanitized demo summary;
  - schedule technical/security review;
  - ask for LOI / written pilot intent;
  - open gated product polish or production-readiness planning.

## Decision Gates After Conversations

- If no interest after 5 conversations: revisit positioning and ICP.
- If interest exists but security blockers dominate: open production-readiness
  planning.
- If first signed LOI or written pilot intent arrives: open SPRINT-PROD-BLOCK
  planning by default.
- If product objections repeat: open a gated fix/polish sprint.
- If SMS/WhatsApp/Twilio becomes a recurring prerequisite: revisit D-030 only
  after pilot evidence and CEO approval.

## Safety Boundaries

- No outreach is performed by this document.
- No insurer contact is performed by this PR.
- No Supabase mutation is approved here.
- No smoke is approved here.
- No deploy is approved here.
- No production action is approved here.
- OpenClaw remains blocked while PR #47 is open.
