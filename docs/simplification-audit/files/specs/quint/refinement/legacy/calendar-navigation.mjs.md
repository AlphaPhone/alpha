# specs/quint/refinement/legacy/calendar-navigation.mjs
- Lines: 120 | Kind: Quint refinement harness, historical comparison (mounted Chromium renderer via `test/fixtures/calendar-mounted-editor.mjs`) | Verdict: DELETE; carry three navigation cases into `journeys/calendar.spec.ts`
- Covers: Day/Month switch, new-event editor Back -> "Resume event draft", existing-event edit Back returns to the same detail, open/close second event — compared with the historical `legacy/Calendar.qnt` (model `Calendar`, found through the legacy manifest fallback in `check-traces.mjs`). Duplicates: navigation is partly covered by live `CalendarPresentation`/`CalendarFormControls` application models; no Playwright spec asserts "Resume event draft" (grep `test/browser`: no hit). Callers: `legacy/index.mjs:165`, `test/quint-historical-calendar-navigation.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 12, 108 | P6 / D11 | Checks the current renderer against a superseded design model; the README and assumptions say so ("historical", "unchanged proposed"). Obligations returned are permanently open by design. | Delete file and test; retire `legacy/Calendar.qnt` with the legacy family. | Low |
| 2 | 12-14 | B5 | Hashes `model.js`, `template.html`, `agent-calendar.ts` etc. as inputs; every renderer edit invalidates its receipt. | Gone with the file. | — |
| 3 | 84-103 | coverage | Real user-visible behaviour worth keeping: (a) Back from a dirty new-event editor returns to the list and offers "Resume event draft"; (b) Back from editing an existing event returns to that event's detail; (c) Month view closes on Alpha Back. | Add these as cases in `journeys/calendar.spec.ts` using the mounted calendar fixture's read-only Eliza rows. | Medium if dropped without a replacement. |

## Proposed end state
Deleted together with `calendar-navigation.md`, `legacy/index.mjs`, `test/quint-historical-calendar-navigation.test.mjs` and `specs/quint/legacy/Calendar.qnt`.
Three navigation cases live in `journeys/calendar.spec.ts`.
`test/fixtures/calendar-mounted-editor.mjs` survives only if other live harnesses import it (check its importer list when deleting).
