# test/browser/dev-workflow-urgency.spec.ts
- Lines: 20 (8 KB) | Kind: Playwright, chromium; simulator "notification, only if urgent" step: offline review dialog and connected JSON decision via stub transport | Verdict: DELETE
- Covers: offline urgency review posts or omits a notification, connected decision parses strict JSON, malformed output never publishes, cancel/late result/persist failure/retirement/external edit prevent publication. Duplicates: none outside the simulator. Callers: chromium only. Helpers: `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | P7 | Dev-only executor; label-driven step ("a notification, only if urgent", `simulated-workflows.ts` D10). | Delete with the simulator. | Low. |
| 2 | 6 | A1 | Seeds legacy `alphaphone:notes:v2`. | Breaks with A2. | — |
| 3 | 11 | — | Strict JSON decision parsing (`{"urgent":"true"}` and extra keys rejected) is simulator code, not the product parser. | Gone. | None. |
| 4 | 15-17 | T7 | Loop over five retirement events, four synthetic. | Gone. | None. |
| 5 | 14 | P3 | `Storage.prototype.setItem` throws when value includes `development-review`. | Gone. | None. |

## Proposed end state
Deleted with the simulator.
