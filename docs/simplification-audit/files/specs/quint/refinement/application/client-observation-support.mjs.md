# specs/quint/refinement/application/client-observation-support.mjs
- Lines: 240 | Kind: Quint refinement harness (imports the real module through `loadBrowserModule`) | Verdict: KEEP (simplify)
- Covers: `ClientObservationSupportSession` (`apps/app/src/runtime/client-observation-support.ts`): one shared background handshake, per-turn comparison, stripping of the optional `calendarDay` field when support is unknown/changed, fencing by retirement and connection epoch. Duplicates: `test/calendar-day-context.test.mjs` imports the same module and checks `contextForObservationSupport`/cache behaviour with plain asserts (partial overlap). Callers: `test/quint-client-observation-support.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 74 | — | Real module import. | None. | — |
| 2 | 60-73 | B5 | Hashes `connection-ui.tsx`, `scripts/prepare-client-features.ts`, `package-lock.json`, `upstream.lock.json` and re-verifies that the projected upstream contract files' hashes equal `.eliza/client-features/.source.json` entries. That is `checkClientFeatures()`'s job (`scripts/prepare-client-features.ts`), repeated here. | Call `checkClientFeatures()` once (as `cloud-connection-notices.mjs` does) or rely on the prepare step; drop the hash loop and unexecuted inputs. | L |
| 3 | 89-98 | — | Reads TS-private `peer.cache`, `peer.known`, `peer.initial` and wraps `cache.admit`. Instance observation, acceptable; breaks on private renames. | Optionally expose a read-only `inspect()` on the session. | L |
| 4 | 222-230 | — | Four degraded responses x two schedules: good coverage of the "strip optional field" rule. | Keep. | — |

## Proposed end state
Same schedules; contract-hash ceremony replaced by one `checkClientFeatures()` call; inputs limited to the module graph and model.
Consider deleting overlapping plain asserts in `test/calendar-day-context.test.mjs` that this campaign subsumes.
