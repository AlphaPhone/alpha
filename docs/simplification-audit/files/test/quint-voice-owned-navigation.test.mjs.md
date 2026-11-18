# test/quint-voice-owned-navigation.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Voice navigation claim, currency check and shell navigation wrappers follow every VoiceOwnedNavigation trace (`application/voice-owned-navigation.mjs` over `prototype/voice-adapter.ts`). Duplicates: Not in an aggregate. Research lists it as a host/Playwright pair with `test/browser/voice-owned-navigation.spec.ts`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-13 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 90, checkpoints > 2500, 8 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | driver | T10 | Driver anchors `voice-adapter.ts` at six text positions. | PORT with the quiet-voice-retry driver (same module). | Medium |

## Proposed end state
- Runner row; Playwright spec stays as the journey.
