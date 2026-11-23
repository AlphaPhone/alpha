# scripts/test-calendar-regression.ts
- Lines: 134 | Kind: device campaign runner (leases an emulator, creates a disposable Android user, installs the verified test-mocks APK pair, runs 10 Calendar instrumentation cases, restores the device clock) | Verdict: KEEP (manual device campaign) + SIMPLIFY; MOVE to `scripts/android/campaigns/calendar.ts` with the other campaign runners
- Covers: Calendar on a real emulator CalendarProvider: creation recovery, flow, CRUD, agent CRUD, options, availability reader, ranges, truncation, Home card, revoked access, external Etar editor. Duplicates: none at device level. Callers/importers: `CAMPAIGN_RUNNERS` in `scripts/android-instrumentation.ts:309` and two registry notes (281, 300); `test/fixtures/isolated-native-campaign.mjs` (spawned in the runner test with fake adb); comments in `CalendarFlowInstrumentedTest.java`, `HomeCalendarCardInstrumentedTest.java`. No workflow runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 59-61, 73-77 | C3 | Hand-rolled `--case/--variant/--external` parser; 14 parsers in `scripts/`. | Use `node:util parseArgs` (or the shared `scripts/lib/args.ts`). | L |
| 2 | 44 | C3 | Local `message(error)` helper (one of many). | Shared `errorText`. | L |
| 3 | 63-72 | D10 | Case table encoded as positional tuples with an optional options object. | Object rows `{class, gate, tests, method?, revoked?}`. | L |
| 4 | 123 | B1 | `catch{}` around reading `verification.json`; the comment explains the fallback (keep, comment is the spec). | Keep. | L |
| 5 | 46-50 | — | Imports upstream `vendor/eliza/packages/app/scripts/lib/*` after `verifyPinnedUpstream`. Correct per AGENTS.md. | Keep. | L |

## Proposed end state
Same behaviour, object case table, `parseArgs`, shared helpers, under a `scripts/android/campaigns/` folder. Owner question: are device campaigns kept as manual evidence tools (they are never run by CI)?
