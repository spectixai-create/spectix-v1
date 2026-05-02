# Investigation Rules

Rules R01-R09 are the product's initial investigation logic. Severity values map to `low`, `medium`, and `high` in [lib/types.ts](../lib/types.ts).

## R01 - Ownership Change Detection

Hebrew title: שינוי בעלות. English title: Ownership change detection.

Trigger: claim involves owned items whose ownership, purchase date, or holder changed near the incident.

Severity: high if ownership changed immediately before the trip or cannot be supported; medium for unclear provenance; low for explainable changes.

Layer: 1.

## R02 - Device Activity Verification

Hebrew title: פעילות מכשיר. English title: Device activity verification.

Trigger: claim involves phones, laptops, cameras, or other connected devices.

Severity: high when post-incident activity contradicts loss/theft; medium when metadata is missing; low when activity supports the story.

Layer: 1.

## R03 - Police Report Structure Check

Hebrew title: מבנה דו"ח משטרה. English title: Police report structure check.

Trigger: police report document is present or required.

Severity: high if major structural elements are missing or authenticity score is low; medium for formatting anomalies; low when the report has all required elements.

Layer: 2. Uses five-element format analysis in `PoliceFormatAnalysis`: case number format, present elements, missing elements, anomalies, authenticity score.

## R04 - Police Verification Letter Check

Hebrew title: אימות משטרה. English title: Police verification letter check.

Trigger: police verification response or letter is available, or verification is required.

Severity: high if verification contradicts the report; medium if verification is unavailable; low if verified.

Layer: 4.

## R05 - Receipt Cross-Check

Hebrew title: בדיקת קבלה. English title: Receipt cross-check.

Trigger: claim includes receipts, invoices, store documents, or value evidence.

Severity: high when store existence, dates, FX rates, or totals contradict the claim; medium when external checks are inconclusive; low when evidence is consistent.

Layer: 2.

## R06 - Police Email Verification

Hebrew title: אימות אימייל משטרה. English title: Police email verification.

Trigger: police verification is attempted by email.

Severity: high if reply denies the case; medium if delivery or reply is missing; low if reply confirms.

Layer: 4.

## R07 - Claimant Readiness Score

Hebrew title: מוכנות מבוטח. English title: Claimant readiness score.

Trigger: enough claimant context exists to score readiness.

Severity: high when readiness is low and contradictions exist; medium for incomplete or generic answers; low for complete, specific, consistent answers.

Layer: 5, with profession interpretation.

## R08 - Policy Issuance Check

Hebrew title: בדיקת הנפקת פוליסה. English title: Policy issuance check.

Trigger: every claim.

Severity: high if policy was issued after travel began or after the incident; medium for unclear issuance timing; low when valid.

Layer: -1.

## R09 - Application Misrepresentation Check

Hebrew title: מצג שווא בהצטרפות. English title: Application misrepresentation check.

Trigger: application data is available and relevant to the claim.

Severity: high if disclosed facts contradict application answers; medium for partial inconsistency; low when consistent.

Layer: -1 and Layer 0 depending on policy impact.
