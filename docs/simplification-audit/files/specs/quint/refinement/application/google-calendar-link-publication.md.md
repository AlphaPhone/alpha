# specs/quint/refinement/application/google-calendar-link-publication.md
- Lines: 25 | Kind: prose note for a refinement campaign | Verdict: MERGE into `google-calendar-link-publication.mjs` header, then delete
- Covers: scope of `GoogleCalendarLinkPublication`. Duplicates: harness `assumptions` (lines 129-131). Callers/importers: none in code; cited by `delete-candidates.md` C3 as evidence.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-17 | ledger | States the production entry: "The application Settings Calendar row opens this panel through `googleConnectionController.openCalendar`" (confirmed: `settings-adapter.ts:861`). `delete-candidates.md` C3 cites this file (lines 18-22) as calling the path test-only and lists it for deletion; lines 18-22 say only that access persistence and provider effects are out of scope. | Correct C3: the model and harness are live. | High if C3 is followed |
| 2 | 9 | B5 | "181 checkpoints across 23 schedules". | Drop counts. | – |

## Proposed end state
No `.md`; the production entry sentence moves into the harness header.
