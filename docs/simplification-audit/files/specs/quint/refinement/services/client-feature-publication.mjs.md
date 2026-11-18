# specs/quint/refinement/services/client-feature-publication.mjs
- Lines: 114 | Kind: Quint refinement harness (indirection: spawns `node --test --test-name-pattern=...` on `test/client-feature-preparation.test.mjs` with env `ALPHA_CLIENT_FEATURE_PUBLICATION_TRACE`, then projects the JSON the test wrote) | Verdict: REWRITE (move the race driver into a fixture module both import)
- Covers: model `ClientFeaturePublication`: three real `prepare-client-features.ts` processes publishing `.eliza/client-features` from authenticated Git source retire the stale tree once, collide without corrupting the winner, read back the exact current inventory and clean up their private stage/aside (1 trace, 16 checkpoints). Duplicates: the same race is the test case `client feature publication retires once while a peer moves the winner` in `test/client-feature-preparation.test.mjs` (its report: KEEP that part, move to `test/tooling/upstream-sources.test.ts`). Importers: `index.mjs`, `test/quint-client-feature-publication.test.mjs` (verdict DELETE), `test/client-feature-preparation.test.mjs` (named as a source; writes the trace file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-41 | T9 | The harness runs a test file through `node --test` with a name pattern and deletes `NODE_TEST_CONTEXT` so the nested runner discovers the test; the test writes observations only when an env knob is set (`test/client-feature-preparation.test.mjs:172`). Renaming the test title breaks the formal check. | Extract the three-process race into `test/fixtures/client-feature-race.mjs` exporting `runPublicationRace()` returning `{events, final}`; the tooling test asserts on it and this harness projects it. Delete the env knob. | Medium (both files change together) |
| 2 | 20-24 | B5 | Hashes the test file, `package-lock.json`, `upstream.lock.json` and two vendor scripts. | Hash the executed script and fixture only. | Low |
| 3 | 43-47 | B3 | Exact final-state assertions (`reader: {status:0, retire:1, publish:1, read:2}`) duplicate what the projected trace already checks against the model. | Keep only `authenticated` and `noSidecars` (not in the projection). | Low |
| 4 | — | §2.11 | Models build tooling (upstream source projection). | Owner question shared with the other build-script models; KEEP meanwhile. | — |

## Proposed end state
~90 lines: `const concrete = await runPublicationRace(scratch)` (spawns the three real preparers itself), same projection and model actions.
No nested `node --test`, no env knob, no test file in sources.
