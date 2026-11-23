# specs/quint/application/GoogleCalendarLinkFlow.qnt
- Lines: 177 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (code markers)
- Covers: agent-side Google Calendar link: grants gate requests, writes need a fresh review, success requires readback of an unpaused, authorised destination (`linkGoogleCalendar` in `google-accounts.ts`, `agent-calendar.ts`). This is the D4 live path, not the deleted client sync stack. Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `google-calendar-link-flow.mjs` (+ `.md`) via `test/quint-google-calendar-link-flow.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 75-112 | T10 | `insert(code, marker, next)` rewrites several exact code strings of google-accounts.ts inside an esbuild onLoad, then evals with `new Function`. | Inject the variables/phase/plan ports as parameters of `linkGoogleCalendar` and import the module. | M |
| 2 | — | D4 | Model sources (`google-accounts.ts`, `agent-calendar.ts`) survive D4; nothing from the deleted renderer stack is modelled. | Keep. | none |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports the module with ports, no code-string insertion.
