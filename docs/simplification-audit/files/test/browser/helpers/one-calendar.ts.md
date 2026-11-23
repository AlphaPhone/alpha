# test/browser/helpers/one-calendar.ts
- Lines: 62 | Kind: Playwright fixture (merged agent Calendar feed + read-only Cloud Google client) | Verdict: **MERGE** into `harness/plugins/calendar.ts`
- Covers: the one merged Calendar: built-in Eliza calendar plus Google calendars, `googleInFeed` visibility, no-Google case, read-only port and Cloud Google client. Duplicates: `canonical-calendar.ts`, `home-calendar.ts` (same records). Callers/importers: `one-calendar.spec.ts`, `specs/quint/legacy/google-connect/check-google-connect-refinement.mjs` (import + pin).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-17, 49-53 | T6, P2 | Imports `connection-ui.tsx`, replaces `getAppRecordClient`, `getCloudClient` and `getSnapshot`. | Bridge `Agent.request` + `AlphaConnection.request` handlers. | Low. |
| 2 | 56-60 | D7 | String-serialised initializer to carry tsx's `__name` helper (same idiom as `native-cloud-signin.ts:118-123`). | One idiom in `harness/bridge.ts`. | none |
| 3 | 10-12 | P13 | Own network fence + connection seed. | Harness auto-fixture. | none |

## Proposed end state
Options `google`, `googleInFeed`, `localEvents` become options of the merged calendar fixture; this file is deleted.
