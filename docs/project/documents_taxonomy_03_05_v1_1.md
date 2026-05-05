# Documents Taxonomy — MVP

**גרסה:** 1.1
**תאריך:** 03_05_2026
**סטטוס:** מוכן ל-#03ד-1 (subtype classifier). cross-cutting layer schemas — ספיק נפרד #03ה.
**גרסה קודמת:** documents_taxonomy_03_05_v1_0.md

---

## עדכונים ב-v1.1

ארבעה שדות חדשים נוספו לכל מסמך כדי לתמוך באימפלמנטציה:

1. **Source** — מקור המסמך:
   - `claimant_upload` — המבוטח מעלה ב-/new
   - `insurer_pull` — המבטח שולף ממערכת פנימית או מקור חיצוני (משרד הפנים, רישומים)
   - `system_internal` — נוצר במערכת (לא מסמך אמיתי)

2. **Extraction prompt** — איזה prompt מחלץ את השדות:
   - `02` — Receipt extraction
   - `03` — Police report extraction
   - `04` — Hotel/generic letter extraction
   - `05` — Medical document extraction
   - `04+02` — שילוב (מסמכים שיש בהם letter + receipt רכיבים)
   - `dedicated` — דורש prompt חדש שייכתב ב-#03ד-2
   - `none` — לא LLM extraction (לדוגמה: photo עם EXIF בלבד)
   - `rule_engine` — מחושב ע"י rule engine, לא LLM

3. **Validated by** — מי בודק את ה-decision-driving checks:
   - `LLM` — דרך extraction prompt
   - `rule_engine` — דטרמיניסטי בקוד (checksums, format match, KB lookups)
   - `cross_cutting_layer` — אחת מ-5 השכבות חוצות-המסמכים (name_match, date_in_policy, currency, authenticity, anomaly)
   - `mixed` — שילוב של כמה

4. **DAG phase** — סדר עיבוד בתוך Pass 1:
   - `1` — Foundation (no inter-document dependencies). מעובד ראשון, במקביל
   - `2` — Depends on Phase 1 results (לרוב על פוליסה / תקנון / נרטיב)
   - `3` — Depends on Phase 2 results
   - `pass2+` — לא מעובד ב-Pass 1; רץ אחרי gap analysis

---

## עקרונות (לא השתנה)

מסמך זה מגדיר 36 סוגי מסמכים בתביעת ביטוח נסיעות. **עיקרון מנחה:** לכל מסמך — רק המידע שמוביל להחלטה. כל השאר מוטמע בשכבות חוצות-מסמכים או נסמך על LLM חופשי.

---

## שכבות חוצות-מסמכים (לא השתנה)

הבדיקות הבאות רצות פעם אחת ברמת התיק, לא לכל מסמך:

1. **name_match** — שם המבוטח מאומת בין כל המסמכים
2. **date_in_policy_period** — כל תאריך מהותי בתוך תקופת הכיסוי
3. **currency_normalization** — Rule 05, נורמליזציה ל-₪
4. **document_authenticity_check** — LLM גנרי, חותמות / ראש דף / חתימה
5. **llm_anomaly_pass** — LLM חופשי לסמן אנומליות לא-מתועדות

ה-schemas של 5 השכבות יוגדרו ב-#03ה. ב-v1.1 כאן רק מצוינות.

---

## פורמט כל הגדרה

```
[N] [שם מסמך]
Source: claimant_upload | insurer_pull | system_internal
Extraction prompt: <prompt id or 'dedicated' or 'rule_engine' or 'none'>
Validated by: LLM | rule_engine | cross_cutting_layer | mixed
DAG phase: 1 | 2 | 3 | pass2+
Required for: רשימת קטגוריות (A/B/C/D/E או "all")
Triggered when: תנאי הפעלה
Core fields: שדות חיוניים בלבד
Decision-driving checks: הצלבות שכישלונן = פעולה
Action on missing: גאפ / דחייה / שאלה למבוטח
```

---

# קטגוריה: זהות, פוליסה ובסיס

## 1. טופס תביעה
**Source:** claimant_upload
**Extraction prompt:** dedicated (form parser, structured fields)
**Validated by:** mixed (LLM extraction, rule_engine for policy validity)
**DAG phase:** 1
**Required for:** all
**Triggered when:** תמיד
**Core fields:** claimant_id, policy_number, incident_date, incident_country, claim_category, total_claimed_amount, currency, bank_account
**Decision-driving checks:**
- policy_number תקף ופעיל בתאריך האירוע (rule_engine — צריך policy doc 2 לאמת)
- claim_category מכוסה בפוליסה (rule_engine, אחרי 2)
- total_claimed_amount בתוך תקרת הסעיף (rule_engine, אחרי 2)
**Action on missing:** דחייה — תנאי בסיס לתיק

## 2. פוליסה
**Source:** insurer_pull (לא המבוטח — המבטח שולף ממערכת)
**Extraction prompt:** dedicated (policy parser; structured insurance fields)
**Validated by:** rule_engine
**DAG phase:** 1
**Required for:** all
**Triggered when:** תמיד (נשלפת ממערכת המבטח)
**Core fields:** policy_number, insured_persons[], policy_start_date, policy_end_date, destination_countries, coverage_categories[], coverage_limits, exclusions, extensions_purchased[], premium_paid, payment_date, health_declaration{}
**Decision-driving checks:**
- policy_purchase_date קודם ל-incident_date (אחרת — Rule 08)
- destination_countries כולל את incident_country
- claim_category נכלל ב-coverage_categories
- בתביעה רפואית: incident_diagnosis לא הוצהר ב-health_declaration → Rule 09
**Action on missing:** דחייה — בלי פוליסה אין תיק

## 3. תקנון פוליסה
**Source:** insurer_pull
**Extraction prompt:** 04 (generic letter extraction; structured exclusions list)
**Validated by:** LLM
**DAG phase:** 1
**Required for:** all
**Triggered when:** תמיד (נשלף עם הפוליסה)
**Core fields:** exclusions[], waiting_periods, deductibles_table, claim_filing_deadlines
**Decision-driving checks:**
- האירוע אינו ברשימת ה-exclusions
- המבוטח עמד ב-claim_filing_deadlines (לרוב 30 יום)
**Action on missing:** המבטח שולף — לא בעיה של מבוטח

## 4. הצעה לביטוח
**Source:** insurer_pull (חוזה מקור)
**Extraction prompt:** 04
**Validated by:** LLM
**DAG phase:** 2 (תלוי ב-2 פוליסה)
**Required for:** B (כשיש Rule 09 trigger)
**Triggered when:** חשד לאי-גילוי מצב קודם
**Core fields:** declarations_made, declarations_omitted, signature_date
**Decision-driving checks:**
- אבחנה נוכחית מצוינת ב-declarations_made — אם לא: סעיף 7 לחוק
**Action on missing:** בקשה מהמבטח (לא מהמבוטח). אם לא קיימת — Rule 09 לא תקף

## 5. תעודת זהות או דרכון
**Source:** claimant_upload (לרוב פעם אחת ב-onboarding) / insurer_pull (אם זה תיק חוזר אצל אותו מבטח)
**Extraction prompt:** dedicated (ID document parser — שם, מספר, תאריך לידה, תוקף)
**Validated by:** rule_engine (id_check_digit_valid לישראל; passport validity)
**DAG phase:** 1
**Required for:** all
**Triggered when:** תמיד
**Core fields:** id_document_type, full_name, id_number, dob, passport_number_if_passport, document_validity
**Decision-driving checks:**
- id_check_digit_valid (אם תעודת זהות ישראלית — rule_engine)
- מסמך בתוקף בתאריך הנסיעה (אם דרכון)
- תאריך לידה תואם להצהרת בריאות (cross_cutting_layer name_match)
**Action on missing:** בקשה. בתביעת חו"ל: אם רק ת.ז. הוגשה ויש חותמות / boarding pass לפי דרכון — בקש דרכון

## 6. אישור חשבון בנק
**Source:** claimant_upload
**Extraction prompt:** dedicated (bank statement / confirmation parser)
**Validated by:** rule_engine (account_number checksum, IBAN mod-97)
**DAG phase:** 1
**Required for:** all
**Triggered when:** תמיד (לזיכוי)
**Core fields:** bank_name, bank_code, branch_number, account_number, account_holder_name, IBAN_if_foreign
**Decision-driving checks:**
- account_number checksum תקף לפי בנק (rule_engine)
- IBAN תקף (אם זר — rule_engine, mod-97)
- account_holder_name = מבוטח (cross_cutting_layer name_match)
**Action on missing:** בקשה למבוטח (חוסם זיכוי, לא טיפול)

## 7. ייפוי כוח
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** LLM
**DAG phase:** 2 (תלוי ב-1 ו-2 לאמת מי המבוטח)
**Required for:** כשהמגיש אינו המבוטח
**Triggered when:** המגיש אינו רשום בפוליסה
**Core fields:** principal_name, principal_id, agent_name, agent_id, scope, signature_date
**Decision-driving checks:**
- principal = מבוטח רשום בפוליסה
- חתימה נוטריונית או דיגיטלית מאומתת (cross_cutting_layer document_authenticity_check)
**Action on missing:** דחייה אדמיניסטרטיבית

## 8. ויתור על סודיות רפואית
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** LLM
**DAG phase:** 2
**Required for:** B
**Triggered when:** קטגוריה B
**Core fields:** patient_name, patient_id, scope_of_disclosure, period_covered, signature_date
**Decision-driving checks:**
- חתימת המבוטח קיימת
- היקף הוויתור כולל את המידע הנדרש (תיק רפואי 12 חודשים, אם נדרש)
**Action on missing:** חוסם בירור Rule 09 ובדיקת תיק רפואי. בקשה למבוטח לפני החלטה

---

# קטגוריה: בסיס נסיעה

## 9. הזמנת טיסה
**Source:** claimant_upload
**Extraction prompt:** 04 (mostly text-extracted booking confirmation)
**Validated by:** LLM
**DAG phase:** 2 (תלוי ב-1 ובפוליסה)
**Required for:** all (תיקים שדורשים נסיעה)
**Triggered when:** תמיד
**Core fields:** pnr, airline, passenger_names[], flight_segments[], booking_date, total_price, currency
**Decision-driving checks:**
- passenger_names כולל את המבוטח (cross_cutting_layer name_match)
- destination ב-flight_segments תואם ל-incident_country
- booking_date מול policy_purchase_date — Rule 08 קריטי
**Action on missing:** בקשה. אם לא מספק — נציג מחליט

## 10. כרטיס טיסה (ticket receipt)
**Source:** claimant_upload (לרוב כלול ב-9)
**Extraction prompt:** 04
**Validated by:** rule_engine (ticket_number checksum IATA)
**DAG phase:** 2
**Required for:** A, B, C, D, E
**Triggered when:** תמיד (לרוב כלול בהזמנה)
**Core fields:** ticket_number, passenger_name, status_per_segment
**Decision-driving checks:**
- ticket_number checksum תקף (rule_engine)
- status="OK" לקטעים הרלוונטיים
**Action on missing:** לרוב כלול ב-9. אם נפרד וחסר — בקשה

## 11. Boarding pass (כרטיס עלייה)
**Source:** claimant_upload
**Extraction prompt:** dedicated (BCBP barcode parser + visual)
**Validated by:** rule_engine (BCBP format spec)
**DAG phase:** 2
**Required for:** A, B, D, E (אימות שהנוסע אכן טס)
**Triggered when:** לא בקטגוריה C-ביטול
**Core fields:** passenger_name, flight_number, flight_date, origin, destination, barcode_data
**Decision-driving checks:**
- barcode_decoded תואם לטקסט הויזואלי (קריטי — זיוף קלאסי, rule_engine)
- BCBP barcode בפורמט תקני (rule_engine)
- בקטגוריה C-ביטול: נוכחות boarding pass = סתירה
**Action on missing:** בקשה. תחליף: רישום משרד הפנים מספיק ברוב המקרים

## 12. רישום משרד הפנים / חותמות גבולות
**Source:** insurer_pull (משרד הפנים — לא המבוטח)
**Extraction prompt:** dedicated (border records parser; digital signature verify)
**Validated by:** rule_engine (digital_signature_valid)
**DAG phase:** 2
**Required for:** all תיקי חו"ל
**Triggered when:** תיק שדורש אימות שהמבוטח אכן יצא
**Core fields:** subject_id, border_movements[] (direction + date + port), digital_signature_status
**Decision-driving checks:**
- digital_signature_valid (קריטי — rule_engine)
- exit_date תואם לטיסה היוצאת
- entry_date תואם לטיסה החוזרת
- incident_date בין exit ל-entry (cross_cutting_layer date_in_policy)
- בקטגוריה C-ביטול: אין יציאה בתאריך הרלוונטי
**Action on missing:** בקשה. אם לא מספק — דגל אי-שיתוף פעולה

## 13. תצהיר אירוע / נרטיב
**Source:** claimant_upload (טקסט חופשי או טופס)
**Extraction prompt:** dedicated (entity extraction: people, places, dates, items)
**Validated by:** mixed (LLM extraction + cross_cutting_layer name_match על entities)
**DAG phase:** 1
**Required for:** all
**Triggered when:** תמיד
**Core fields:** narrative_text, extracted_entities (LLM: people, places, dates, items)
**Decision-driving checks:**
- entities מוצלבים מול שאר המסמכים (cross_cutting_layer name_match — Pass 2)
- timeline פנימי עקבי (LLM)
- מסמכים שהנרטיב מחייב נמצאים בתיק (rule_engine — Pass 2)
**Action on missing:** בקשה למבוטח לתאר את האירוע

---

# קטגוריה A: גניבה / כבודה

## 14. דוח משטרה
**Source:** claimant_upload
**Extraction prompt:** 03
**Validated by:** mixed (LLM extraction + rule_engine for KB format match + Rule 06 mail verification)
**DAG phase:** 3 (תלוי ב-9 ו-13 לאמת התאמת מסמכי תיק)
**Required for:** A (סכום > 3,000 ₪), D (תאונה)
**Triggered when:** סכום עובר סף, או הסיפור מחייב פנייה למשטרה
**Core fields:** case_number, report_date, station_name, station_country, officer_name, reporter_name, items_reported[], stamp_present
**Decision-driving checks:**
- reporter_name = מבוטח (cross_cutting_layer name_match)
- items_reported תואם פריטי תביעה (חוסר התאמה = דגל קריטי, LLM)
- report_date אחרי incident_date ובחלון סביר
- format match ל-KB מדינתי (Rule 03)
- Rule 04: stamp present (cross_cutting_layer document_authenticity_check)
- Rule 06 (Pass 2): אימות במייל אם סכום > 5,000 ₪ — V2 OSINT
**Action on missing:** קטגוריה A מעל סף → gap חובה. ללא דוח אין תיק

## 15. PIR — Property Irregularity Report (דוח אי-סדירות כבודה)
**Source:** claimant_upload
**Extraction prompt:** dedicated (PIR-specific parser)
**Validated by:** rule_engine (bag_tag IATA prefix lookup)
**DAG phase:** 3
**Required for:** A — אובדן ע"י חברת תעופה
**Triggered when:** טענה שהכבודה אבדה / ניזוקה ע"י חברת תעופה
**Core fields:** pir_number, airline, airport, report_date, flight_number, bag_tag_number, incident_type
**Decision-driving checks:**
- bag_tag 3 ספרות ראשונות = airline IATA code (rule_engine)
- airline + flight = הזמנה (rule_engine)
- אם תביעת אובדן סופי: עברו 21 יום מתאריך ה-PIR
**Action on missing:** דחייה לתביעת אובדן ע"י חברת תעופה

## 16. מכתב מהמלון / נותן שירות
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** LLM
**DAG phase:** 3
**Required for:** A (גניבה במלון), B/C/E כשהסיפור מחייב
**Triggered when:** הסיפור נסמך על אישור מנותן שירות
**Core fields:** hotel_name, hotel_address, letter_date, signatory, guest_dates_of_stay, content_summary
**Decision-driving checks:**
- guest_name = מבוטח (cross_cutting_layer name_match)
- dates של שהיה כוללים את incident_date
- hotel_address תואם לנרטיב
**Action on missing:** בקשה. תחליף: אישור הזמנה (Booking / Airbnb)

## 17. קבלה (purchase / replacement / lodging / meals / transport)
**Source:** claimant_upload
**Extraction prompt:** 02
**Validated by:** mixed (LLM + currency_normalization layer)
**DAG phase:** 3
**Required for:** all (purpose שונה לפי קטגוריה)
**Triggered when:** הצדקת ערך פריט או הוצאה
**Core fields:** vendor_name, vendor_country, transaction_date, items[], total_amount, currency, receipt_number, payment_method, receipt_purpose
**Decision-driving checks:**
- transaction_date קודם ל-incident_date (לרכישה) או אחריו (החלפה / שהיה)
- vendor_country תואם למקום
- חישוב סך = סכום בקבלה (rule_engine)
- Rule 05: שער חליפין (cross_cutting_layer currency_normalization)
- מספרי קבלה עוקבים בכמה קבלות מאותה חנות = דגל (Rule 05/Pass 2)
**Action on missing:** לרכישה — אם פריט > 800 ₪: gap חובה. להחלפה / שהיה: אם נטענה הוצאה — gap

## 18. תמונות (פריטים / נזק)
**Source:** claimant_upload
**Extraction prompt:** none (EXIF only) + LLM visual analysis
**Validated by:** mixed (rule_engine for EXIF parse + LLM visual)
**DAG phase:** 3
**Required for:** A, D
**Triggered when:** הצדקת קיום פריט / חומרת נזק
**Core fields:** EXIF (date, GPS, device), visual_content_summary, photo_purpose
**Decision-driving checks:**
- EXIF date קודם ל-incident_date (פריטים) או אחריו תוך ימים (נזק)
- מכשיר הצילום אינו ברשימת הגנובים (rule_engine — cross-check items_reported מ-14)
**Action on missing:** לא חובה ב-MVP. דגל אם המבוטח טוען לראיות ולא מספק

## 19. מספר סידורי / IMEI
**Source:** claimant_upload (תמונה או טקסט)
**Extraction prompt:** dedicated (text/image OCR for serial)
**Validated by:** rule_engine (IMEI Luhn checksum)
**DAG phase:** 3
**Required for:** A — ציוד אלקטרוני > 1,500 ₪
**Triggered when:** פריט אלקטרוני בכמות מהותית
**Core fields:** device_imei_or_serial, device_model, linked_account_status
**Decision-driving checks:**
- IMEI checksum תקף (rule_engine — Luhn)
- Rule 02 (Pass 2): המכשיר לא היה פעיל אחרי תאריך הגניבה — ב-MVP בקשה ידנית
**Action on missing:** gap חובה לפריט אלקטרוני מעל סף

## 20. עדויות / מכתבי עדים
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** LLM (handwriting consistency)
**DAG phase:** 3
**Required for:** none קבוע
**Triggered when:** הנרטיב מצטט עדים
**Core fields:** witness_name, witness_contact, witness_statement, signature_date
**Decision-driving checks:**
- שם העד מוזכר בנרטיב המבוטח (cross_cutting_layer name_match על נרטיב)
- כתב יד אחיד בין מספר עדויות = זיוף (LLM)
**Action on missing:** לא נדרש לכל תיק. אם הנרטיב מסתמך — gap

---

# קטגוריה B: רפואי

## 21. אישור רפואי / דו"ח ביקור
**Source:** claimant_upload
**Extraction prompt:** 05
**Validated by:** mixed (LLM + name_match + date_in_policy + Pass 2 OSINT V2)
**DAG phase:** 3
**Required for:** B
**Triggered when:** תמיד בקטגוריה B
**Core fields:** facility_name, facility_country, physician_name, patient_name, patient_dob, visit_date, diagnosis_summary, treatment_summary, prescriptions[], stamp_present
**Decision-driving checks:**
- patient_name + dob = מבוטח (cross_cutting_layer name_match)
- visit_date בתוך תקופת הנסיעה (cross_cutting_layer date_in_policy_period)
- visit_date תואם ל-incident_date
- אבחנה תואמת לסיפור (LLM)
- Pass 2 OSINT (V2): facility ב-Google Places — לא ב-MVP
**Action on missing:** דחייה לתביעה רפואית — חובה

## 22. סיכום אשפוז (discharge summary)
**Source:** claimant_upload
**Extraction prompt:** dedicated (#03ד-2 — discharge-specific schema)
**Validated by:** mixed (LLM + cross-cutting layers)
**DAG phase:** 3
**Required for:** B — אשפוז בלבד
**Triggered when:** הנרטיב טוען לאשפוז
**Core fields:** facility_name, admission_date, discharge_date, final_diagnosis, procedures[], discharge_condition
**Decision-driving checks:**
- חפיפה של תאריכי האשפוז עם הנסיעה
- discharge_date תואם ל-boarding pass של חזרה (אם רלוונטי)
- בתביעת קיצור נסיעה: discharge קודם לטיסה החוזרת המקורית
**Action on missing:** לתביעת אשפוז — gap חובה

## 23. קבלה רפואית
**Source:** claimant_upload
**Extraction prompt:** 02 (receipt) + 05 (medical context)
**Validated by:** mixed
**DAG phase:** 3 (תלוי ב-21)
**Required for:** B
**Triggered when:** דרישת החזר הוצאה רפואית
**Core fields:** facility_name, services[], total, currency, billed_directly_to_insurer (boolean)
**Decision-driving checks:**
- facility = אישור רפואי (21) — cross-document
- billed_directly_to_insurer = false (אם true, המבוטח לא שילם)
- שירותים תואמים לאבחנה (LLM)
- Rule 05: שער חליפין (cross_cutting_layer currency_normalization)
**Action on missing:** gap חובה אם נדרש החזר כספי

## 24. מרשמים + קבלות תרופות
**Source:** claimant_upload
**Extraction prompt:** dedicated (#03ד-2 — medications + receipts schema)
**Validated by:** LLM
**DAG phase:** 3 (תלוי ב-21)
**Required for:** B (רכיב משני)
**Triggered when:** דרישת החזר על תרופות
**Core fields:** medication_names[], prescribing_physician, pharmacy_name, dispense_date, cost
**Decision-driving checks:**
- prescribing_physician = רופא באישור הרפואי (cross-document)
- medications תואמות לאבחנה (LLM)
- dispense_date אחרי visit_date
**Action on missing:** רק לחלק התרופות. השאר ממשיך

## 25. תיק רפואי 12 חודשים
**Source:** insurer_pull (קופת חולים, אחרי ויתור סודיות)
**Extraction prompt:** dedicated (#03ד-2 — medical history aggregation)
**Validated by:** LLM
**DAG phase:** pass2+ (רץ רק אחרי Rule 09 trigger ב-Pass 1)
**Required for:** B (כשיש Rule 09 trigger)
**Triggered when:** Rule 09 trigger
**Core fields:** providers[], diagnoses[], medications[], procedures[]
**Decision-driving checks:**
- אבחנה רלוונטית קודמת לאבחנה הנוכחית = הפרת Rule 09 → סעיף 7 (LLM + rule_engine)
**Action on missing:** דורש מסמך 8 (ויתור סודיות). אי-מתן = דגל אי-שיתוף פעולה, לא דחייה אוטומטית

## 26. אישור פינוי רפואי
**Source:** claimant_upload (מהחברת assistance שביצעה את הפינוי)
**Extraction prompt:** dedicated (#03ד-2 — evacuation auth schema)
**Validated by:** LLM
**DAG phase:** 3 (תלוי ב-21 + 22)
**Required for:** B (פינוי בלבד)
**Triggered when:** תביעה כוללת פינוי
**Core fields:** assistance_company_name, case_reference, evacuation_date, from_location, to_location, medical_justification, accompanying_personnel, cost
**Decision-driving checks:**
- assistance_company = ספק מוכר של המבטח (rule_engine — KB lookup)
- evacuation_date תואם לחומרת מצב באישור הרפואי (LLM, cross-doc)
- מקום סיום תואם (cross-document — להצליב לרישום משרד הפנים אם ישראל)
**Action on missing:** דחייה לתביעת פינוי

---

# קטגוריה C: טיסה

## 27. אישור חברת תעופה לביטול / איחור
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** LLM (Pass 2: V2 — flight API)
**DAG phase:** 2 (תלוי ב-9)
**Required for:** C
**Triggered when:** תמיד בקטגוריה C
**Core fields:** airline, flight_number, original_datetime, actual_datetime, delay_minutes, status, reason, passenger_name, pnr, compensation_already_paid
**Decision-driving checks:**
- pnr + flight = הזמנה (cross-document)
- passenger_name = מבוטח (cross_cutting_layer name_match)
- compensation_already_paid > 0 → קיזוז מסכום התביעה
- Pass 2 (V2): API טיסות מאמת status בפועל — לא ב-MVP
**Action on missing:** דחייה — אין דרך לאמת אירוע ביטול / איחור

## 28. אישור הזמנה חלופית / הקדמה
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** LLM
**DAG phase:** 3 (תלוי ב-9 ו-27)
**Required for:** C (החמצה / החלפה), E (הקדמה לחירום)
**Triggered when:** דרישת החזר על הזמנה חלופית
**Core fields:** new_pnr, new_flight, purchase_date_of_replacement, price_difference_vs_original
**Decision-driving checks:**
- purchase_date אחרי הביטול / האירוע (לא לפני)
- new_destination = original_destination (cross-document)
- price הפרש סביר ל-last-minute (LLM judgment)
**Action on missing:** gap להחזר עלות

---

# קטגוריה D: אחריות / נזק

## 29. דוח נזק / accident report
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** LLM
**DAG phase:** 3
**Required for:** D
**Triggered when:** תמיד בקטגוריה D
**Core fields:** accident_date, accident_location, parties_involved[], damages_described, injuries_described, who_called_authorities
**Decision-driving checks:**
- accident_date בתוך תקופת הנסיעה (cross_cutting_layer date_in_policy_period)
- מבוטח = אחד הצדדים (cross_cutting_layer name_match)
- consistent עם תמונות נזק (18) ועם הערכת תיקון (32) — cross-document
**Action on missing:** דחייה למרבית תביעות D

## 30. חוזה השכרה
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** LLM
**DAG phase:** 3
**Required for:** D — אירועי השכרה
**Triggered when:** האירוע מערב פריט שכור
**Core fields:** rental_company, period, renter_name, item_details, insurance_purchased_at_rental, deposit
**Decision-driving checks:**
- renter = מבוטח (cross_cutting_layer name_match)
- rental_period כולל את תאריך האירוע (cross_cutting_layer date_in_policy_period)
- אם CDW מלא נרכש בהשכרה → כפל ביטוח (rule_engine)
- סוג הפריט מאושר ברישיון (cross-document — מסמך 31)
**Action on missing:** דחייה לאירועי השכרה

## 31. רישיון נהיגה
**Source:** claimant_upload
**Extraction prompt:** dedicated (license parser)
**Validated by:** rule_engine (license categories validation)
**DAG phase:** 3 (תלוי ב-30 לאמת התאמה)
**Required for:** D — אירועי רכב
**Triggered when:** האירוע מערב נהיגה
**Core fields:** license_number, license_country, license_categories[], expiry_date, holder_name
**Decision-driving checks:**
- holder_name = מבוטח (cross_cutting_layer name_match)
- expiry_date אחרי incident_date
- categories כולל את סוג הרכב המעורב (rule_engine — קריטי לדו-גלגלי)
- אם יעד דורש היתר בינלאומי — נוכחות (rule_engine — KB lookup)
**Action on missing:** דחייה — coverage layer

## 32. הערכת תיקון / חשבונית תיקון
**Source:** claimant_upload
**Extraction prompt:** 02 (receipt-like)
**Validated by:** mixed (LLM + benchmark rule_engine)
**DAG phase:** 3 (תלוי ב-29 ו-18)
**Required for:** D
**Triggered when:** דרישת החזר עלות נזק
**Core fields:** repair_shop_name, item_details, damages_listed[], total_estimate_or_invoice, date
**Decision-driving checks:**
- פריט = פריט באירוע (cross-document)
- נזקים = תמונות נזק (18) — cross-document
- benchmark לסבירות סכום (rule_engine — KB)
**Action on missing:** gap חובה לדרישת החזר

## 33. פרטי צד ג'
**Source:** claimant_upload (form input או מסמך)
**Extraction prompt:** dedicated (third-party form parser; structured)
**Validated by:** mixed (LLM + Pass 2 OSINT V2)
**DAG phase:** 3
**Required for:** D — תאונה עם צד ג'
**Triggered when:** טענה על אחריות צד ג'
**Core fields:** name, contact, insurance_company, policy_number, vehicle_or_property
**Decision-driving checks:**
- צד ג' לא קשור למבוטח (cross_cutting_layer name_match — must be different)
- חברת ביטוח של צד ג' אמיתית (Pass 2 OSINT V2 — לא ב-MVP)
**Action on missing:** gap לתביעה נגד צד ג'

---

# קטגוריה E: חירום / פינוי

## 34. הוראת פינוי / אזהרת מסע
**Source:** insurer_pull (משרד החוץ — לא המבוטח)
**Extraction prompt:** 04
**Validated by:** mixed (LLM + Pass 2 OSINT V2 verification)
**DAG phase:** 3
**Required for:** E
**Triggered when:** תמיד בקטגוריה E (לא-רפואי)
**Core fields:** issuing_authority, directive_date, area_covered, severity, source_url
**Decision-driving checks:**
- area_covered כולל את מקום המבוטח
- directive_date קודם להקדמת הטיסה (cross_cutting_layer date_in_policy_period)
- severity מצדיק פינוי (LLM)
- Pass 2: אימות באתר משרד החוץ הרשמי / Wayback Machine — V2 OSINT, לא ב-MVP
**Action on missing:** דחייה — אי אפשר להצדיק פינוי בלי בסיס רשמי

## 35. אישור התקשרות עם השגרירות
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** mixed (LLM + Pass 2 V2)
**DAG phase:** 3
**Required for:** E (במקרים מסוימים)
**Triggered when:** הסיפור מחייב פעולה דיפלומטית
**Core fields:** embassy_name, contact_date, consular_officer, case_number, nature_of_contact, evidence_form
**Decision-driving checks:**
- domain רשמי של משרד החוץ (rule_engine — KB)
- תאריך תואם לקו הזמן של הפינוי (cross-document)
**Action on missing:** רק כשהסיפור מצריך

---

# קטגוריה: הקשר

## 36. מכתב מעסיק
**Source:** claimant_upload
**Extraction prompt:** 04
**Validated by:** mixed (LLM + Pass 2 V2 רשם החברות)
**DAG phase:** 3
**Required for:** C (ביטול עסקי), אימות עיסוק (Layer 0.5) במקרים קריטיים
**Triggered when:** ביטול נסיעה עסקית, או דרושה וולידציה של עיסוק מוצהר
**Core fields:** employer_name, signatory, employee_name, employee_position, letter_content, letter_date, letterhead, stamp
**Decision-driving checks:**
- employee = מבוטח (cross_cutting_layer name_match)
- position תואם להצהרת עיסוק ב-Layer 0.5
- Pass 2 (V2): חברה קיימת ברשם החברות — לא ב-MVP
**Action on missing:** רק כשהקשר עיסוק קריטי או ביטול עסקי

---

# סיכום

**סה"כ:** 36 סוגי מסמכים

**חלוקה:**
- זהות + פוליסה + בסיס: 8 (1-8)
- בסיס נסיעה: 5 (9-13)
- A (גניבה / כבודה): 7 (14-20)
- B (רפואי): 6 (21-26)
- C (טיסה): 2 (27-28)
- D (אחריות): 5 (29-33)
- E (חירום): 2 (34-35)
- הקשר: 1 (36)

## פילוח לפי Source

- **claimant_upload (28):** 1, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 35, 36
- **insurer_pull (8):** 2, 3, 4, 12, 25, 34
- **system_internal:** אין כאן (כל מסמך הוא נתון אמיתי שמגיע מאיפשהו)

הערה: 5 (ת.ז./דרכון) ו-6 (חשבון בנק) יכולים להיות שניהם claimant_upload או insurer_pull תלוי במבטח. למעבר ל-#03ד-1 — ברירת המחדל היא claimant_upload.

## פילוח לפי Extraction prompt

- **02 (Receipt):** 17, 23 (חלקי), 32
- **03 (Police):** 14
- **04 (Hotel/generic):** 3, 4, 7, 8, 9, 10, 16, 20, 27, 28, 29, 30, 34, 35, 36
- **05 (Medical):** 21, 23 (חלקי)
- **dedicated (#03ד-2):** 1, 2, 5, 6, 11, 12, 13, 19, 22, 24, 25, 26, 31, 33

נספרים:
- 04 broad: 15 מסמכים
- dedicated: 14 מסמכים
- 02 broad: 2 מסמכים
- 03 broad: 1 מסמך
- 05 broad: 1 מסמך

זה אומר ש-**#03ד-1 פותר ~50%** של הטקסונומיה (כל ה-04 + 02 + 03 + 05 broad).
**#03ד-2 פותר את הנותרים** (14 prompts ייעודיים).

## פילוח לפי DAG phase

- **Phase 1:** 1, 2, 3, 5, 6, 13 (foundation — ניתנים לעיבוד מיידי)
- **Phase 2:** 4, 7, 8, 9, 10, 11, 12, 27 (תלויים ב-foundation)
- **Phase 3:** 14-20, 21-24, 26, 28-36 (תלויים ב-Phase 2)
- **Pass 2+:** 25 (רק אחרי Rule 09 trigger)

ה-pipeline ב-#03ד צריך לחכות שמסמכי Phase 1 יעובדו לפני שמתחיל ב-Phase 2/3 (אורקסטרציה ב-Inngest).

---

## שלב הבא

1. **#03ד-1** (next): subtype classifier (Prompt 01b) + DB column document_subtype + 4 broad extraction prompts (02, 03, 04, 05) + DAG phase 1 documents
2. **#03ד-2:** 14 dedicated extraction prompts לסוגים מורכבים (1, 2, 5, 6, 11, 12, 13, 19, 22, 24, 25, 26, 31, 33)
3. **#03ה:** 5 cross-cutting layer schemas (name_match, date_in_policy_period, currency_normalization, document_authenticity_check, llm_anomaly_pass)
4. **KB:**
   - police_formats: 3-5 מדינות (Rule 03)
   - assistance_companies (לאימות מסמך 26)
   - foreign_ministry_domains (לאימות מסמך 35)
   - international_license_destinations (לאימות מסמך 31)
5. **rule_engine — checksum implementations:**
   - id_check_digit (ישראל)
   - bank account checksum (פר-בנק)
   - IBAN mod-97
   - IATA ticket_number
   - BCBP barcode parser
   - bag_tag IATA prefix lookup
   - IMEI Luhn
6. **insurer_pull integration architecture** — לא נכלל ב-#03ד-1; ספיק נפרד #04 (insurer pull integration). MVP יכול להמשיך עם הכל כ-claimant_upload, וכשיגיע מבטח ראשון — להתאים.

---

## עדכוני גרסה

| גרסה | תאריך | תיאור |
|---|---|---|
| 1.0 | 03_05_2026 | טיוטה ראשונית — 36 מסמכים בפורמט תמציתי |
| 1.1 | 03_05_2026 | הוספת 4 שדות פר-מסמך: Source, Extraction prompt, Validated by, DAG phase. פילוח Source/Prompt/Phase בסיכום. תיקון ספירה (אומתה כ-36). הבחנה בין claimant_upload ל-insurer_pull. |

**Footer:** Documents Taxonomy v1.1 • 2025-05-03 • ready for #03ד-1
