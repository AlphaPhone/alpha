# test/fixtures/shade-row-custody.mjs
- Lines: 113 | Kind: transplant fixture (slices `notifications-adapter.ts`, strips types, runs in a vm with a closed bridge) | Verdict: PORT (merge with `shade-notice-question.mjs` into one real-import harness)
- Covers: shade row custody: poll results, open/dismiss/clear operations against captured render slots, visit/epoch fences across hide, visibility and device-state events, busy/error flags. Duplicates: same adapter slicing as `shade-notice-question.mjs`; `notice()` row builder duplicated in that file's `rows`. Callers/importers: `test/shade-row-custody.test.mjs` (DELETE), `test/quint-shade-row-custody.test.mjs` (Quint wrapper, merge into the one Quint runner), live harness `specs/quint/refinement/application/shade-row-custody.mjs` (model `ShadeRowCustody.qnt`, manifest line 3746).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-21, 52 | T2, T10 | Markers: `const opaque`..`type Notice =` and from `export function installNotificationsAdapter`; `^export ` stripped; `installNotificationsAdapter(Shell)` appended. | Import the real adapter (see shade-notice-question report); pass `native`, `noticeReviewable`, `reviewContentQuestion`, `formatTime`, `Capacitor` and timer functions as ports. | medium |
| 2 | 8-10 | B5 | Provenance list includes `template.html` and `package-lock.json`, which the code never reads. | Drop; the manifest pins files. | none |
| 3 | 27-29 | — | Captures `setTimeout`/`setInterval` by hand. | Use `node:test` mock timers or the harness port. | none |
| 4 | all | C5 | Second copy of the adapter boot and shell double. | One shared harness. | low |

## Proposed end state
Folded into the single notifications-adapter harness in `specs/quint/refinement/application/`. Row custody stays
covered by the `ShadeRowCustody` refinement at 100 %; the host test and this file go.
