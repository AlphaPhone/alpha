# specs/quint/refinement/application/reminder-adapter-fixture.mjs
- Lines: 158 | Kind: shared refinement fixture (esbuild bundle of real `apps/app/src/prototype/reminder-adapter.ts` with `reminder-creations`, `reminder-deletions`, `reminder-journal-store` and the upstream reminder journal real; 11 import specifiers routed to local ports; held native calls) | Verdict: KEEP — this is the pattern the two transplant reminder fixtures should be ported onto
- Covers: nothing by itself; provides `buildReminderAdapter(mutate)` and `reminderAdapterFixture(compiled)`. Importers: `reminder-decision.mjs`, `reminder-intents.mjs`, `reminder-refresh.mjs`, `reminder-tap-tokens.mjs`, `reminder-todo-attempt.mjs` (all KEEP, so it survives). Candidate new importers: `reminder-open-intent.mjs` and `retained-reminder-tap-admission.mjs` (replacing `test/fixtures/reminder-open-intent.mjs` and `test/fixtures/retained-reminder-tap.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-34 | T10 | Splices `__ports.probe.tap = …` after the literal `let tapBusy = false, tapRequested = false, tapInteraction = 0;` in the **bundled output** (source is `let tapBusy=false, tapRequested=false, tapInteraction=0;` at reminder-adapter.ts:29; the match relies on esbuild's printer). Asserted present, so it fails loudly. | Export a read-only `reminderTapState()` from the adapter (dev-gated) or keep the three flags on the shell instance; drop the splice. | Low |
| 2 | 20, 35 | B3, T5 | `mutate` hook exists for the wrapper tests' "replay notices a changed implementation" mutation cases; `if (mutate(code) !== code) assert.notEqual(mutated, code)` calls `mutate` twice and asserts a tautology. These mutation cases test the harness, not the product (T5). | Drop the second call. If the mutation tests in `test/quint-reminder-*.test.mjs` are deleted (T5), drop the `mutate` parameter entirely. | None |
| 3 | 6 | C3 | Re-declares `root`; `support.mjs` exports the same constant. | Import it. | None |
| 4 | 11-17 | T10 (specifier pins) | Ports matched by regex on import text (`/connection-ui$/`, `/(^|\/)daily$/`, …). | Acceptable; resolve by absolute path when files move. | Low |
| 5 | 28-29 | B5 | Asserts four expected inputs are in the bundle. | Keep (cheap guard that the real modules run). | — |
| 6 | 147-152 | T8 | `idle()` spins 20 `setImmediate` turns plus a digest wait; deterministic, no wall-clock sleep. | None. | — |

## Proposed end state
Same fixture without the output-text splice and without the double `mutate`; also used by the open-intent and retained-tap harnesses so `test/fixtures/reminder-open-intent.mjs` and `test/fixtures/retained-reminder-tap.mjs` (transplants) can be deleted. Optionally move to `specs/quint/refinement/application/fixtures/`.
