# specs/quint/refinement/native/listener-input.mjs
- Lines: 25 | Kind: Quint refinement driver (staged/upstream sense classes + ports, 20 scenarios in one compiled campaign) | Verdict: KEEP
- Covers: always-on listener input loop: invocation, short/ignored utterances, busy/locked, calls, other recordings, mic privacy, playback guard, indicator hidden, lease revoked, destroy with pending ASR; model `NativeListenerInput` (native manifest, live; D7 keeps always-on listening). Duplicates: speech-gate behaviour also in `speech-gate.mjs` (separate model). Callers/importers: `test/quint-listener-input.test.mjs`, native aggregate `index.mjs:35,191` (T4); README.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | C5 | Same ten-class list as `listener-service.mjs`/`listener-admission-probe.mjs`. | Import `listenerSources`. | None |
| 2 | — | P6 | Code under test is upstream sense + patches. | Path-filter to pin/patches/model/folder. | None |
| 3 | — | T4 | Aggregate duplicate. | Aggregate goes. | None |

## Proposed end state
Unchanged campaign using the shared source list; one runner.
