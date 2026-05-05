# LLM Prompts — Claim Investigator POC

מסמך זה מכיל את 10 ה-prompts הקריטיים של המערכת. **המערכת איטרטיבית** — חלק מהפרומפטים רצים פעם אחת בלבד, חלק רצים מספר פעמים, וחלק (Prompt 10) רצים בין כל pass.

**עקרונות כלליים לכל ה-prompts:**

1. **JSON-only output** — כל prompt מחזיר JSON מובנה, ללא טקסט חופשי.
2. **שפה — עברית בפלט הטקסטואלי** — שדות מבוססי טקסט בעברית. שדות סטרוקטוריים באנגלית.
3. **Temperature נמוך** — `0.2` לרוב. רק ל-Brief Generator (Prompt 09) → 0.4.
4. **Model — Sonnet 4.6 default. Opus 4.7 רק ל-Brief Generator.**
5. **System prompt קצר, user prompt עם הקלט**.
6. **דוגמאות בתוך ה-prompt** (few-shot).
7. **בדיקה שהפלט תקין JSON** — שכבת fallback בקוד.

**ספריית עזר נדרשת:**

```typescript
// /lib/llm/client.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(params: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const response = await client.messages.create({
    model: params.model || 'claude-sonnet-4-6-20250915',
    temperature: params.temperature ?? 0.2,
    max_tokens: params.max_tokens || 2000,
    system: params.system,
    messages: [{ role: 'user', content: params.user }]
  });
  
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text in response');
  return textBlock.text;
}

export async function callClaudeJSON<T>(params: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<T> {
  const text = await callClaude(params);
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    throw new Error(`JSON parse failed. Output: ${cleaned.slice(0, 500)}`);
  }
}
```

**הערה על iterative usage:**

ב-Pass 1 רצים Prompts 01-08 על המידע הראשוני.
ב-Pass 2-3 רץ Prompt 10 לזיהוי gaps + רק ה-Prompts מ-01-08 שהקלט שלהם השתנה.
Prompt 09 רץ פעם אחת בסוף, על המידע המצטבר מכל ה-passes.

---

## Prompt 01 — Document Classification

**מטרה:** סיווג מסמך לאחת מ-7 קטגוריות.

**רץ ב-Pass 1 בלבד** (אין צורך לסווג שוב).

**System prompt:**
```
You are a document classifier for an insurance claims system. Identify the document type from OCR text and filename.

Possible document types:
- police_report
- hotel_letter
- receipt
- medical_report
- witness_letter
- flight_doc
- photo
- other

Output strictly in JSON. No preamble.
```

**User prompt template:**
```
File name: {{file_name}}
OCR text (first 1500 chars):
{{ocr_text}}

Return JSON:
{
  "document_type": "police_report" | "hotel_letter" | "receipt" | "medical_report" | "witness_letter" | "flight_doc" | "photo" | "other",
  "confidence": 0.0-1.0,
  "reasoning": "סיבה קצרה בעברית"
}
```

---

## Prompt 02 — Receipt Extraction

**מטרה:** חילוץ סטרוקטורי של נתונים מקבלת רכישה.

**רץ ב-Pass 1 בלבד.**

**System prompt:**
```
You are a structured data extractor for purchase receipts.

Rules:
- If a field is not present, use null. Never guess.
- Currencies: ISO 4217 codes.
- Dates: ISO 8601.
- The country_inferred field: best guess based on language, currency, address.

Output strictly in JSON.
```

**User prompt template:**
```
OCR text of receipt:
{{ocr_text}}

Extract:
{
  "vendor_name": "string or null",
  "vendor_address": "string or null",
  "vendor_country_inferred": "ISO 3166 country code or null",
  "purchase_date": "YYYY-MM-DD or null",
  "purchase_time": "HH:MM or null",
  "currency": "ISO 4217 code or null",
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null,
  "payment_method": "cash | credit | debit | other | null",
  "card_last_4": "string or null",
  "items": [
    {
      "name": "string",
      "quantity": number,
      "unit_price": number or null,
      "line_total": number or null
    }
  ],
  "receipt_number": "string or null",
  "notes": "string in Hebrew or null"
}
```

---

## Prompt 03 — Police Report Extraction with Format Analysis

**מטרה:** חילוץ + ניתוח פורמט.

**רץ ב-Pass 1 בלבד.**

**System prompt:**
```
You are an expert in international police report forensics.

You receive:
- OCR text
- Country
- Reference format from KB

Your output identifies:
- Extracted data
- Elements PRESENT vs MISSING vs reference
- Anomalies (inconsistent fonts, suspicious case numbers, generic titles)

Be strict but fair. Missing elements → flagged, not declared fraud.

Output strictly in JSON.
```

**User prompt template:**
```
Country: {{country}}

Reference format for {{country}}:
{{reference_format_json}}

OCR text:
{{ocr_text}}

Return JSON:
{
  "extracted": {
    "case_number": "string or null",
    "report_date": "YYYY-MM-DD or null",
    "incident_date": "YYYY-MM-DD or null",
    "station_name": "string or null",
    "station_city": "string or null",
    "officer_name": "string or null",
    "officer_rank": "string or null",
    "reporter_name": "string or null",
    "incident_summary": "string or null",
    "items_reported": []
  },
  "format_analysis": {
    "case_number_format_match": true | false | null,
    "case_number_format_notes": "string in Hebrew",
    "elements_present": [],
    "elements_missing": [],
    "anomalies_detected": [
      {
        "type": "missing_stamp | inconsistent_font | generic_signature | format_deviation | other",
        "description": "string in Hebrew"
      }
    ],
    "overall_authenticity_score": 0.0-1.0,
    "score_reasoning": "string in Hebrew"
  }
}
```

---

## Prompt 04 — Hotel Letter / Generic Document Extraction

**מטרה:** חילוץ ממכתב תומך.

**רץ ב-Pass 1 בלבד.**

(מבנה זהה למסמך הקודם — קלט OCR + סוג מסמך, פלט JSON עם issuer, date, claims, language quality, red flags).

---

## Prompt 05 — Medical Document Extraction

**מטרה:** חילוץ מאישור רפואי / discharge / מרשם.

**רץ ב-Pass 1 בלבד.**

(מבנה זהה — facility, doctor, patient, visit, diagnosis_brief, treatment_brief, currency, total, anomalies. **שמירה על privacy** — diagnosis_brief קצר, ללא PHI מפורט).

---

## Prompt 06 — Narrative Consistency Analyzer

**מטרה:** דירוג כמה הסיפור "מתוסרט מדי" — שדה Consistency של Rule 07.

**רץ ב-Pass 1 בלבד** (הסיפור לא משתנה).

**System prompt:**
```
You are a behavioral analyst for insurance claims. Rate how "scripted" or "rehearsed" a claim narrative feels.

Critical principle:
- LEGITIMATE under stress: forgets details, hedges ("about", "I think"), gaps in timeline, irrelevant details, minor contradictions.
- FRAUDULENT planner: perfectly linear, exact timestamps, no hedges, no gaps, no irrelevant details.

Rate 0-100:
- 0-30: Rough, gappy — typical legitimate stressed claimant
- 31-60: Reasonably organized with normal gaps
- 61-85: Very organized — methodical person OR planner
- 86-100: Perfectly scripted — every detail aligns. Suspicious.

A high score is NOT proof. One signal among many.

Output strictly in JSON.
```

**User prompt template:**
```
Claimant's free-text description:
"""
{{incident_description}}
"""

Documents summary:
{{documents_summary}}

Return:
{
  "score": 0-100,
  "score_reasoning": "string in Hebrew",
  "scripted_indicators": [],
  "natural_indicators": []
}
```

---

## Prompt 07 — Misrepresentation Check (Rule 09)

**מטרה:** הערכת סבירות שמשתמש שונה אכן מסוגל להשתמש בפריט.

**רץ ב-Pass 1 בלבד.**

**System prompt:**
```
You assess plausibility of a stated user-attribution for an insured item.

Implausible examples:
- 5-year-old as user of 8000 ILS laptop
- 90-year-old as user of professional drone
- Baby as user of smartphone

Plausible examples:
- 14-year-old with tablet
- Elderly with basic phone
- Spouse using partner's device
- Adult sibling using shared item

Rate 0.0-1.0. Conservative: below 0.3 only when implausibility is clear. Above 0.5 = reasonable.

Output strictly in JSON.
```

**User prompt template:**
```
Item:
- Name: {{item_name}}
- Category: {{item_category}}
- Value (ILS): {{item_value}}

Stated user:
- Name: {{user_name}}
- Age: {{user_age}}
- Relation: {{user_relation}}

Primary insured: {{insured_name}}

Return:
{
  "plausible": true | false,
  "confidence": 0.0-1.0,
  "reasoning": "string in Hebrew",
  "evidence_to_request": []
}
```

---

## Prompt 08 — Receipt Cross-Check + Question Generator (Rule 05)

**מטרה:** הצלבה בין קבלות + ייצור שאלות הבהרה.

**רץ ב-Pass 1 + רץ מחדש ב-Pass 2 אם הוסף שער חליפין מ-API.**

**System prompt:**
```
You analyze a set of receipts from an insurance claim, looking for cross-receipt anomalies.

Patterns:
- Same PDF generation signature across vendors (forged)
- Currency mismatching country
- Date sequences that don't make sense
- Suspiciously round amounts
- Vendors that don't appear to exist
- Missing receipts for major claimed items
- Identical formatting across receipts that should be different

Then generate 2-4 clarification questions:
- Phrased helpfully ("to expedite processing")
- Force claimant to provide details only known if story is genuine
- Specific enough that vague answers signal
- Don't duplicate existing info

Output strictly in JSON.
```

**User prompt template:**
```
Claim context:
- Incident date: {{incident_date}}
- Country: {{country}}
- Type: {{claim_type}}
- Amount (ILS): {{claimed_amount}}
- Verified currency rates (if available from Pass 2): {{currency_rates_json}}

Receipts:
{{receipts_json}}

Return:
{
  "anomalies": [
    {
      "type": "string",
      "severity": "low | medium | high",
      "title": "string in Hebrew",
      "evidence": {},
      "affected_receipts": [],
      "suggested_check": "string in Hebrew"
    }
  ],
  "clarification_questions": []
}
```

**הערה — שאלות הבהרה הן הליבה:**

דוגמאות לניסוח טוב:
- "לזירוז הטיפול — תוכל לציין שעה משוערת של הרכישה בחנות X ומה ראית בה מעבר לפריטים שרכשת?"
- "תוכל לצרף את אישור הרכישה המקורי (מייל מהחנות / חיוב כרטיס אשראי) לפריט Y?"
- "ציינת רכישה ב-15.3 בחנות Z — האם הייתה בה תור? איזה צבע היו השקיות?"

---

## Prompt 09 — Investigation Brief Generator (העיקרי) — מעודכן ל-iterative

**מטרה:** ייצור ה-Brief הסופי על בסיס כל ה-passes.

**רץ פעם אחת בסוף, אחרי שכל ה-passes הושלמו.**

**Model:** Claude Opus 4.7 (פלט קריטי). Temperature 0.4.

**System prompt:**
```
You are an experienced insurance fraud investigator producing one-page Hebrew Investigation Briefs for claims adjusters.

Tone: dry, professional, factual. NO clichés, NO drama, NO marketing language. Write like a senior investigator summarizing for a colleague.

Style rules:
- Hebrew throughout (except universal English technical terms)
- Short sentences
- Cite specific evidence
- Acknowledge uncertainty: "ייתכן ש..." OK; "ללא ספק..." not OK
- Follow the exact format provided

This is an iterative system. The brief may include data from up to 3 passes:
- Pass 1: Initial analysis
- Pass 2: After external enrichment (currency, places, IP geo, etc.)
- Pass 3: After final verification

The brief presents the FINAL state but includes a Pass History section showing how the conclusion evolved.

The brief is one page. Adjuster reads in 2 minutes. Make every word count.

Output as plain text following the exact format. Do NOT output JSON.
```

**User prompt template:**
```
=== Claim Data ===
{{claim_json}}

=== Coverage Check ===
{{coverage_json}}

=== Underwriting Compliance ===
{{underwriting_json}}

=== Trip Context ===
{{trip_context_json}}

=== Readiness Score ===
{{readiness_json}}

=== Findings (sorted by severity, including which pass they emerged from) ===
{{findings_json}}

=== Pass History ===
{{passes_history_json}}
// Includes: pass_number, started_at, completed_at, risk_band, findings_count, gaps_identified, enrichments_added

=== Pending Clarification Questions ===
{{questions_json}}

Generate the Investigation Brief in this EXACT format:

═══════════════════════════════════════
תיק [claim_number] — בריף חקירתי
═══════════════════════════════════════

[✅ או ❌] Coverage: [עבר / לא עבר]
   [פרטי הכיסוי או סיבה לדחייה]

[⚠ או ✅] Underwriting Compliance: [N] חריגות
   [פרטי חריגות או "אין חריגות"]

הקשר תיק:
   מטרה: [trip purpose בעברית]
   קשרים מקומיים: [פרטים]
   נסיעות קודמות: [N], מתוכן עם תביעות: [N]
   עיסוק: [profession]
   רלוונטיות עיסוק: [גבוהה / בינונית / נמוכה / לא רלוונטי]
   פקטור הקשר: [X.X]x — [נימוק]

[⚠ או ✅] Claimant Readiness: [score]/100
   פרשנות: [פרשנות הציון בהקשר העיסוק]

תקציר: [3-4 שורות]

הערכת סיכון: [ירוק / צהוב / כתום / אדום]
נימוק: [שורה אחת]

ממצאים מרכזיים:
1. [HIGH/MED/LOW] [Pass N] [כותרת] — [הסבר עם evidence]
2. ...

פעולות נדרשות לפני אישור:
1. [פעולה ספציפית]
2. ...

שאלות הבהרה למבוטח:
1. [שאלה ידידותית]
2. ...

──── Pass History ────
Pass 1 (XX:XX): [risk] | [N] ממצאים | [N] חסרים זוהו
[ממצאים עיקריים שהופיעו]
Pass 2 (XX:XX): [risk] | [N] ממצאים | [N] העשרות
[העשרות שבוצעו: שערי חליפין, Google Places, IP]
[שינויים מ-Pass 1]
Pass 3 (XX:XX): [risk] | [N] ממצאים [או "דולג — Risk Band יציב"]
[שינויים מ-Pass 2]

המלצה סופית: [אישור / בקשת מידע נוסף / חקירה מעמיקה / דחייה לפי תנאי פוליסה]
═══════════════════════════════════════
```

---

## Prompt 10 — Gap Identifier + Action Selector (חדש — קריטי ל-iterative)

**מטרה:** אחרי כל pass, לזהות אילו חסרים נוצרו ומה הפעולה הנכונה לכל אחד.

**רץ אחרי כל pass** (Pass 1 → ניתוח לפני Pass 2; Pass 2 → ניתוח לפני Pass 3).

**עיקרון:** ה-LLM **לא מחליט עצמאית** — הוא מקבל כקלט גם תוצאות בדיקה דטרמיניסטית מקדימה, ומשלים אותה רק במקומות שבהם הבדיקה הדטרמיניסטית לא הספיקה.

**System prompt:**
```
You are a Gap Identifier for an insurance claim investigation system.

Your role: AFTER a pass of analysis completes, identify what's missing or unclear that another pass could potentially resolve.

You receive:
- Current state of the claim after the pass
- All findings so far
- Deterministic gap detection results (gaps already identified by rules)
- Available enrichment sources (APIs, OSINT)

Your job: identify ADDITIONAL gaps the deterministic system missed, and prioritize them.

Categories of gaps:
1. missing_doc — A document that should exist for this claim type but isn't provided
2. missing_data_field — A specific data point that could be enriched (currency, location, etc.)
3. missing_external_validation — Verification from an external source (Google Places, FlightAware, etc.)
4. suspicious_anomaly — Something contradictory or unusual that needs investigation

For each gap:
- Determine fill_method: auto_api / auto_osint / manual_claimant / manual_adjuster
- Estimate value_to_resolution: 0-1.0 (how much would resolving this gap change the conclusion)
- Provide specific action

Critical: do NOT invent gaps. If everything is fine, return empty arrays. False gaps waste cost and time.

Output strictly in JSON.
```

**User prompt template:**
```
Pass number: {{current_pass}}
Pass result summary:
{{pass_summary_json}}

All findings so far (with severity):
{{findings_json}}

Deterministic gaps already identified by rules:
{{deterministic_gaps_json}}

Available enrichment sources:
- Currency rates API (free, fast)
- Google Places (cheap, fast)
- IP geolocation (free, fast)
- FlightAware (V2 - not yet available)
- Basic Google search OSINT (manual review needed)
- Send email to police station (Rule 06, V2 only - flag for adjuster)

Maximum next-pass cost budget: $1.00

Return:
{
  "additional_gaps_identified": [
    {
      "gap_type": "missing_doc | missing_data_field | missing_external_validation | suspicious_anomaly",
      "description": "string in Hebrew explaining what's missing and why it matters",
      "fill_method": "auto_api | auto_osint | manual_claimant | manual_adjuster",
      "fill_target": "specific value/document being sought",
      "value_to_resolution": 0.0-1.0,
      "estimated_cost_usd": number,
      "action_to_take": "specific concrete action"
    }
  ],
  "should_run_another_pass": true | false,
  "reason": "string in Hebrew explaining why",
  "early_stop_recommendation": {
    "stop": true | false,
    "reason": "string in Hebrew"
  }
}
```

**דוגמה — אחרי Pass 1 על תיק T01:**

**Input:**
```
Pass number: 1
Pass result summary:
{
  "risk_band": "orange",
  "findings_count": 4,
  "completed_rules": ["r01", "r02", "r03", "r04", "r05", "r07", "r09"],
  "skipped_rules_reason": {}
}

Findings:
- HIGH: דוח משטרה ללא חותמת
- HIGH: שינוי בעלות 4 ימים לפני
- MEDIUM: קבלה ללא ספק רשמי
- MEDIUM: לא צורף ראיית ניתוק טלפון

Deterministic gaps:
- missing_data_field: שער חליפין USD/THB ב-14.3.2024
- missing_external_validation: אימות חנות "Trendy Electronics" ב-Bangkok
- missing_doc: ראיית ניתוק טלפון מ-Find My
```

**Output:**
```json
{
  "additional_gaps_identified": [
    {
      "gap_type": "missing_external_validation",
      "description": "המלון 'Royal Phuket Beach' מוזכר במכתב התומך אבל לא אומת ע\"י Google Places. אם המלון לא קיים בכתובת זו, זה מצביע על מסמך מזויף.",
      "fill_method": "auto_api",
      "fill_target": "Google Places lookup for 'Royal Phuket Beach'",
      "value_to_resolution": 0.65,
      "estimated_cost_usd": 0.02,
      "action_to_take": "Call Google Places API with hotel name + Phuket address"
    },
    {
      "gap_type": "suspicious_anomaly",
      "description": "מספר התיק במשטרה (2024-3-12-0451) חורג מהפורמט הסטנדרטי בתאילנד. ניתן להריץ חיפוש OSINT בסיסי לבדוק אם הפורמט הזה הופיע בדיווחים אמיתיים.",
      "fill_method": "auto_osint",
      "fill_target": "Google search 'Phuket police report number format 2024'",
      "value_to_resolution": 0.30,
      "estimated_cost_usd": 0.05,
      "action_to_take": "Run targeted OSINT search on case number format"
    }
  ],
  "should_run_another_pass": true,
  "reason": "זוהו 5 פערים שניתנים להשלמה אוטומטית או חצי-אוטומטית. צפויה התקדמות משמעותית בהבנת התיק ב-Pass 2.",
  "early_stop_recommendation": {
    "stop": false,
    "reason": "אין סיבה לעצור — כדאי להריץ Pass 2."
  }
}
```

**דוגמה — אחרי Pass 2 על אותו תיק:**

**Input:**
```
Pass number: 2
Pass result summary: {risk_band: "orange", findings_count: 5, ...}
[Includes new finding: HIGH — חנות "Trendy Electronics" לא נמצאה ב-Google Places]
```

**Output:**
```json
{
  "additional_gaps_identified": [],
  "should_run_another_pass": false,
  "reason": "Pass 2 הוסיף ממצא חדש משמעותי. Risk Band יציב על כתום. אין פערים נוספים שניתן להשלים אוטומטית. הפערים שנותרו דורשים אינטראקציה עם המבוטח (ראיית ניתוק טלפון), שזה מסלול נפרד.",
  "early_stop_recommendation": {
    "stop": true,
    "reason": "התיק מוכן לבריף סופי. ממתין לתשובת המבוטח לפני סקירת נציג."
  }
}
```

---

## עלויות מוערכות לתיק טיפוסי (משוקלל לפי passes)

| Prompt | מודל | טוקנים בממוצע | עלות לקריאה | קריאות לתיק טיפוסי | עלות לתיק |
|---|---|---|---|---|---|
| 01 — Classification | Sonnet 4.6 | ~800 in / 100 out | $0.003 | 5 (per doc) | $0.015 |
| 02 — Receipt | Sonnet 4.6 | ~1000 in / 400 out | $0.008 | 3 | $0.024 |
| 03 — Police | Sonnet 4.6 | ~2000 in / 800 out | $0.015 | 1 | $0.015 |
| 04 — Hotel/Generic | Sonnet 4.6 | ~1500 in / 400 out | $0.009 | 2 | $0.018 |
| 05 — Medical | Sonnet 4.6 | ~1500 in / 400 out | $0.009 | 0-1 | $0.009 |
| 06 — Narrative | Sonnet 4.6 | ~2000 in / 500 out | $0.012 | 1 | $0.012 |
| 07 — Misrepresentation | Sonnet 4.6 | ~500 in / 300 out | $0.005 | 0-1 | $0.005 |
| 08 — Receipt Cross-check | Sonnet 4.6 | ~3000 in / 800 out | $0.020 | 1-2 (Pass 1 + Pass 2 if rates added) | $0.040 |
| 09 — Brief | Opus 4.7 | ~5000 in / 1500 out | $0.110 | 1 | $0.110 |
| 10 — Gap Identifier | Sonnet 4.6 | ~2000 in / 600 out | $0.014 | 1-2 | $0.028 |

**סך הכל לתיק טיפוסי:** ~$0.28 ($1.05 ב-₪).
**+ External APIs:** ~$0.05.
**= סה"כ ~$0.33 לתיק.**

ב-Tier מבטח שמטפל ב-300 תיקים ביום: ~370 ₪ ביום עלות. **שולי רווח גבוהים** במחיר 30 ₪ לתיק.

---

## איטרציות מתוכננות

ה-prompts האלה הם גרסה ראשונה. צפה לאיטרציות:

1. **לפני בנייה:** עבור על Prompt 08 (שאלות הבהרה) ו-Prompt 10 (Gap Identifier) — הליבה.
2. **בזמן Spike 3-7:** בדיקה על דוגמאות אמיתיות. תיקונים בפלט סטרוקטורי.
3. **בזמן Spike 11 (Iterative Pipeline):** Prompt 10 ידרוש 5-10 איטרציות עד שהוא מזהה gaps נכון.
4. **בזמן Spike 16 (Brief):** Prompt 09 ידרוש איטרציות על המבנה והסגנון.
5. **אחרי 30 התיקי דמה:** פולישינג סופי.

## הצעד הבא

1. עבור על Prompt 08 (שאלות הבהרה) ו-Prompt 10 (Gap Identifier) — שתי הנקודות הקריטיות.
2. עבור על מבנה ה-Brief (Prompt 09) עם החלק החדש "Pass History".
3. אחרי שמסכימים — בנייה של Spike 0 → 3.
