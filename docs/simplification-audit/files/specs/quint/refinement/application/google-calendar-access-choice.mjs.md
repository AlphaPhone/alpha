# specs/quint/refinement/application/google-calendar-access-choice.mjs
- Lines: 210 | Kind: Quint refinement harness over `test/fixtures/google-account-panel.mjs`, which transplants `runtime/google-connection-ui.tsx` (reads text, inserts an observer before `' async function load(){'`, transforms with esbuild, evaluates in JSDOM with a module map keyed by import specifier) | Verdict: KEEP (port its fixture)
- Covers: the "Allow Calendar changes" choice is bound to the exact verified account read and Calendar intent; a fresh read, owner change, close or new intent withdraws held Ask/Allow receipts; read-only grants go to consent, write grants link with the current rows. Duplicates: run by `test/quint-google-calendar-access-choice.test.mjs` and aggregate `index.mjs:66` (T4). Callers/importers: those two.
- Model: `GoogleCalendarAccessChoice.qnt`, live (sources `runtime/google-connection-ui.tsx`, `google-connection-return.ts`). Production path: Settings → Google Calendar row (`settings-adapter.ts:861` → `googleConnectionController.openCalendar`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 58-59 | T2/T10 | Depends on `mountGoogleAccountPanel`, a transplant of the panel with `' async function load(){'` as anchor (fixture line 42). | Port the fixture to an esbuild bundle with `onResolve` virtual ports, the technique `google-calendar-link-publication.mjs:13-53` already uses; run it in JSDOM or Chromium. One mounting helper for all three panel harnesses (C5). | Med |
| 2 | 21-33 | – | Bundles five real runtime modules (`cloud-protocol`, `google-connection-return`, `google-workspace-return`, `gmail-grants`, `google-accounts`) and injects them. Real code, good; becomes unnecessary once the panel is bundled with its real imports. | Fold into the bundle. | Low |
| 3 | – | ledger | `delete-candidates.md` C3 lists `test/fixtures/google-account-panel.mjs` for deletion with the Calendar linked-sync stack. This harness and `google-consent-admission.mjs` (both live) import it. Deleting it breaks two live models. | Correct C3: port, not delete. | High if followed |
| 4 | 11-19 | – | Notice text → class map couples to UI copy. | Acceptable (copy is what the user sees). | Low |

## Proposed end state
Same 17 schedules on the shared bundled panel helper; no text anchor in `google-connection-ui.tsx`. One runner. Lane:
`google-connection-ui.tsx`, `google-connection-return.ts`, `google-accounts.ts`, `google-agent-access.ts`, model.
