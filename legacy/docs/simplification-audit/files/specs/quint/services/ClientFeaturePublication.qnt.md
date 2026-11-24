# specs/quint/services/ClientFeaturePublication.qnt
- Lines: 186 | Kind: Quint model, live (8 tests, 5 invariants); models build tooling (`upstream:prepare-client`) | Verdict: KEEP; harness SIMPLIFY (stop spawning a named host test)
- Covers: three concurrent publishers of the private `.eliza/client-features` cache. A complete cache is published once and a collision loser only reads back. Unknown or linked paths are refused before retirement, stale regular trees are repaired, and a directory `lstat` is a probe, never authentication. Sources: `scripts/prepare-client-features.ts`, `scripts/upstream-native-source.ts`, `upstream.lock.json`, `vendor/eliza/packages/app/scripts/lib/{immutable-workspace-source,committed-source}.mjs` (exist). Duplicates: `test/client-feature-preparation.test.mjs` (the same scenario). Callers: harness `refinement/services/client-feature-publication.mjs` (114 lines), wrapper `test/quint-client-feature-publication.test.mjs`, aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 34-36 | T9 / T4 | The harness spawns `node --test --test-name-pattern=^client feature publication retires once while a peer moves the winner$ test/client-feature-preparation.test.mjs` with `ALPHA_CLIENT_FEATURE_PUBLICATION_TRACE` set, then reads the trace the test writes. That couples it to another test's title and to an env knob in a host test, and it costs a child Node process with a 120 s timeout. | Move the three-publisher scenario into an exported fixture (`test/fixtures/client-feature-publication.mjs`) that both call, or into the harness alone. Then delete the env-knob branch from the host test. | medium |
| 2 | manifest | §2.3 | `upstream.lock.json` as a source selects this model for every pin bump. That is correct, because the publisher hashes the lock. | Keep. | none |
| 3 | 54-62 | — | The comments separate model abstraction from source facts ("reads is the finite class 0,1,2-or-more"). Good. | — | none |
| 4 | whole | §2.11 | Build-tool model. | KEEP; owner question. | owner |

## Proposed end state
Model unchanged. One shared scenario fixture, no cross-test spawn.
