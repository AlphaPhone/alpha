# test/connection-work-lifecycle.test.mjs
- Lines: 6 (very long minified lines) | Kind: transplant (slices `async function work(` up to the next `\n/** ` in `connection-ui.tsx`, 15 fake globals) | Verdict: DELETE
- Covers: background/foreground connection work publishes and clears its own busy flags; retired work cannot clear a newer operation's state. Duplicates: `connection-presentation-state.test.mjs` (release/retire fences), `test/browser/connection-activity-presentation.spec.ts` (busy/background presentation). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T9 | `ALPHA_CONNECTION_SOURCE` knob also read by `settings-signout-confirm.test.mjs`; no runner sets it. | Delete. | Low |
| 2 | 3-4 | T2 / D8 | Marker slice to the next JSDoc; whole test on 4 statement-soup lines. | Delete. | Low |
| 3 | 6 | — | "Retired work cannot overwrite a newer operation" is the useful case. | One case in `test/integration/connection-cloud.test.ts` once `work()` belongs to an importable controller (stage F). | Low |

## Proposed end state
File deleted; one stale-operation case recorded as a follow-up for the connection controller integration test.
