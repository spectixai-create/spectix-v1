# SPRINT-002B LLM Call Breakdown

## Source

- Smoke run: `SMOKE-002B-005-20260505185743`
- Claim ID: `9222197e-2760-4c10-8b71-501a2aeb4158`
- Project queried: non-production `aozbgunwhafabfmuwjol`
- Query type: read-only `claims`, `passes`, `documents`, and `audit_log` selects
- Production project `fcqporzsihuqtfohqtxs`: not queried, not touched

## Pass Totals

- Pass status: `completed`
- `passes.llm_calls_made`: `23`
- `passes.cost_usd`: `0.231822`
- `claims.total_llm_cost_usd`: `0.231822`

## Phase Totals

| Phase                  | Counted calls | Cost USD | Input tokens | Output tokens |
| ---------------------- | ------------: | -------: | -----------: | ------------: |
| broad_classifier       |             9 | 0.068244 |        16793 |          1191 |
| subtype_classifier     |             6 | 0.051021 |        11772 |          1047 |
| normalized_extractor   |             7 | 0.103464 |        14568 |          3984 |
| legacy_broad_extractor |             1 | 0.009093 |         1861 |           234 |
| skip_defer             |             0 |        0 |            0 |             0 |

## Document Totals

| File                                   | Document type  | DB subtype       | Kind                  | Route                    | Counted calls | Cost USD |
| -------------------------------------- | -------------- | ---------------- | --------------------- | ------------------------ | ------------: | -------: |
| receipt_general.synthetic.pdf          | receipt        | general_receipt  | normalized_extraction | receipt_general          |             3 | 0.032022 |
| police_report.synthetic.pdf            | police_report  | police_report    | normalized_extraction | police_report            |             2 | 0.022914 |
| medical_visit.synthetic.pdf            | medical_report | medical_visit    | normalized_extraction | medical_visit            |             3 | 0.029937 |
| hotel_letter.synthetic.pdf             | hotel_letter   | hotel_letter     | normalized_extraction | hotel_letter             |             2 | 0.021822 |
| flight_booking_or_ticket.synthetic.pdf | flight_doc     | flight_booking   | normalized_extraction | flight_booking_or_ticket |             3 | 0.032355 |
| boarding_pass.synthetic.pdf            | flight_doc     | boarding_pass    | normalized_extraction | boarding_pass            |             3 | 0.028743 |
| witness_letter.synthetic.pdf           | witness_letter | witnesses        | normalized_extraction | witness_letter           |             2 | 0.021357 |
| pharmacy_receipt.synthetic.pdf         | receipt        | pharmacy_receipt | extraction            | receipt                  |             3 | 0.024528 |
| other_misc.synthetic.pdf               | other          | damage_report    | classification        | n/a                      |             2 | 0.018144 |

## Why The Total Is 23 Calls

The original smoke sanity estimate expected roughly 27 calls. The final non-production audit evidence records 23 counted LLM calls because:

- Broad classification ran for all 9 documents: 9 calls.
- Subtype classification produced 6 paid calls. Three subtype results were deterministic/zero-cost paths with an audit action but no counted LLM call: `police_report`, `hotel_letter`, and `witnesses`.
- Normalized extraction ran for the 7 MVP documents: 7 calls.
- Legacy broad fallback extraction ran for B1 `pharmacy_receipt`: 1 call.
- B2 `other_misc` went through skip/defer and did not run an extractor: 0 calls.

Total: 9 + 6 + 7 + 1 = 23 counted calls.
