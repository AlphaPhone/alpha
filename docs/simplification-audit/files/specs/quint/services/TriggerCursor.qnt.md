# specs/quint/services/TriggerCursor.qnt
- Lines: 125 | Kind: Quint model (live; development trigger simulator) | Verdict: KEEP (D20: dev workflow simulator stays with its proofs); harness KEEP, trim
- Covers: the dev-only workflow trigger runtime: scan latch, dispatch hold, per-workflow cursors that keep the last known side across background gaps, leave-once per observed transition, broken flow isolation, place edit restarting the cursor. Duplicates: Lemma `specs/lemma/apps/app/src/browser/workflow-triggers.dfy` proves `cursorThrough` properties of the same file (complementary, not duplicate). Callers/importers: `quint:check`; `refinement/services/trigger-cursor-replay.mjs` (via `forward-replays.mjs`, aggregate `services/index.mjs`); `test/trigger-cursor-isolation.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D6 | Models `apps/app/src/browser/workflow-trigger-runtime.ts` + `workflow-triggers.ts`, reached only from `browser/simulated-workflows.ts` (the development simulator, `ELIZA_DEV_ALLOW_TEST_MOCKS=1`). Per D20 it stays while the simulator stays; when the structural pass moves the simulator under `dev/`, the manifest `sources`/`symbols` paths must move with it. | Keep; update paths in the same commit as the `dev/` move. If the owner retires the simulator, delete model, harness and the `.dfy` together. | Low |
| 2 | manifest | T10 | 12 symbol pins (`blocked`, `held`, `wake`, `position`, `watching`, `placeChanged`…) — several are common words that a regex will match anywhere. | Drop the `symbols` list; the replay imports the real module, which is the actual tie. | Low |
| 3 | harness | T2 (mild) | `trigger-cursor-replay.mjs:41` imports the real `workflow-triggers.ts` (good) but installs synthetic `window`/`document`/`localStorage`/`alphaTriggerDevice` globals; `test/trigger-cursor-isolation.test.mjs` exists only to prove those globals are restored, and boots PGlite to do so. | Keep the replay; delete the isolation test (T5) once the replay uses a scoped fixture (`test.extend`-style setup/teardown). | Low |
| 4 | 97-101 | — | Five witnesses each pin one reachable interesting state; fine. | None. | — |

## Proposed end state
Model unchanged, manifest pins files only, path updated when the simulator moves to `dev/`. One forward replay
importing the real modules; no separate globals-isolation test.
