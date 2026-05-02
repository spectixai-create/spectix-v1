# Product

Spectix is an AI-powered investigation system for travel insurance claims in the Israeli market. It gives claim adjusters a concise Investigation Brief that combines coverage status, fraud and inflation signals, missing evidence, claimant readiness, and a recommended handling path.

The first target market is small Israeli insurers and teams that currently rubber-stamp many medium-value travel claims because manual investigation is too expensive. The initial sweet spot is claims around 5K-15K ILS where automation can change the decision economics without adding friction to clean cases.

The product is built around a risk-stratified friction model: most claims should move quickly, while suspicious or incomplete claims receive proportionate evidence requests. The model is roughly 60/30/8/2: 60% clean fast-pass, 30% light clarification, 8% deeper investigation, 2% high-risk escalation.

## Value Proposition

1. Fraud detection: catch roughly 5-10% suspicious or fabricated claims that would otherwise pass.
2. Inflation detection: identify 25-40% inflated claims, especially receipts, FX, dates, and item/value inconsistencies.
3. Process optimization: reduce manual handling for roughly 60% clean claims.

## V1 Scope

V1 focuses on travel insurance claim intake, document extraction, rule-based investigation, iterative enrichment, and adjuster-facing review screens. Client-side evidence collection is deferred to V1.5 per D-003.

## UI Language

User-facing UI is Hebrew and RTL. Documentation is English. Hebrew appears in docs only when quoting actual UI copy, for example:

```text
פתיחת תיק חדש
תור עבודה
בריף חקירתי
```
