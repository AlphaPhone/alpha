# test/quint-quiet-voice-retry.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Voice surface `quietVoiceRetry` (wait timer, chat currency, refusal limit) follows every QuietVoiceRetry trace; driver `specs/quint/refinement/application/quiet-voice-retry.mjs` over `apps/app/src/prototype/voice-adapter.ts`. Duplicates: none in an aggregate (not in `application/index.mjs`); voice behaviour overlaps the voice view family (`voice-calm-cloud-errors`, `voice-assistant.test.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-13 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 93, checkpoints > 2500, 10 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | driver | T10 | The driver cuts `voice-adapter.ts` at text anchors (3 `indexOf`/slice sites). | PORT: export the retry controller from `voice-adapter.ts` (or a `voice/quiet-retry.ts` module) with timer/currency ports and import it. | Medium |

## Proposed end state
- No standalone file. A `QuietVoiceRetry` row in the application manifest names the driver, and the runner asserts the receipt.
- Port the driver to import the exported retry controller.
