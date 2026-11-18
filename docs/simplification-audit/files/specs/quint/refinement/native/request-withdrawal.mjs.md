# specs/quint/refinement/native/request-withdrawal.mjs
- Lines: 181 | Kind: Quint refinement driver (Java worker threads + bundled real `LocalAgentProtocol` from `apps/app/src/runtime/local-agent.ts`, compared step by step with ITF states) | Verdict: KEEP; SIMPLIFY (drop model-text parsing, canaries and double build)
- Covers: Withdrawing a local-agent request while queued, enrolling or after dispatch; late cancellation finding nothing; queueing behind two busy workers; lifecycle supersession; renderer abort emitting exactly one cancel packet; at most one dispatch/enrollment/answer per request. Model `NativeRequestWithdrawal` (`manifest.json:4197`). Duplicates: none. Callers/importers: `native/index.mjs:72,94`, `test/quint-native-request-withdrawal.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-54 | T10 | Parses the `.qnt` file with regexes to recover each `run …Test =` `.then(…)` chain, and asserts exactly 5 tests and `/5 passing/`. Editing the model's run expressions (or adding a sixth test) breaks the harness. | Drop the named-scenario path (the five witnesses and 32 seeded traces already reach the same states), or write the five command lists in JS. Remove exact-count assertions. | Low |
| 2 | 145-154 | B5/T5 | "Negative oracle canaries" mutate copies of observations to prove the validator throws: tests of the test. | Delete. | None |
| 3 | 128 | B5 | Second esbuild build only to assert the bundle did not change mid-run. | Delete. | None |
| 4 | 133-137 | B5 | Hashes generated command files into the receipt. | Delete. | None |
| 5 | 20-21, 117-118 | — | Renderer side bundles the real module with `@capacitor/core` and `../platform-plugins` resolved to a closed stub. Good, import-based. | Keep; share the bundle helper. | — |
| 6 | 57-67 | — | `validateWithdrawalObservation` checks genuine invariants (≤2 workers, ≤1 dispatch/answer). | Keep. | — |
| 7 | 13 | C3 | `jsonJar` from `test/fixtures/jvm-tools.mjs`. | Shared JVM-tools module. | None |

## Proposed end state
~120 lines: bundle renderer, run random + witness schedules through the extracted Java request class, replay each on the renderer, compare all eight fields, `checkTraces`.
