# specs/quint/application/ShadeRowCustody.qnt
- Lines: 148 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) of dev-only code | Verdict: KEEP (conditional, D19/D20) / PORT harness
- Covers: Simulated shade list publication: a re-entered shade cannot publish an old poll, retained controls cannot act on replaced rows, Clear dispatches exact keys and reports partial results. Duplicates: NotificationCollection covers the production collection side. Callers/importers: `shade-row-custody.mjs` (aggregate) <- `test/quint-shade-row-custody.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D6 | Header: "The simulated shade owns list publication": dev-only (`main.tsx:139`). | Same D19/D20 decision as ShadeNoticeQuestionAdmission. | M |
| 2 | harness | T2/T10 | `test/fixtures/shade-row-custody.mjs:19-21` slices `notifications-adapter.ts` (`const opaque` .. `type Notice =`, and from `export function installNotificationsAdapter`), strips types, runs in `vm`; `sources` also pin `prototype/template.html`. | PORT to a bundled import if kept. | M |

## Proposed end state
- Kept only with the simulated shade; one shared bundled fixture for both shade models.
