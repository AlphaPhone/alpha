# specs/quint/refinement/native/speech-gate.mjs
- Lines: 17 | Kind: Quint refinement harness (Java, whole upstream class) | Verdict: KEEP
- Covers: model `NativeSpeechGate` (live) against the upstream `SpeechGate.java` (via `current-sources.mjs`); upstream-only, no Alpha source. Duplicates: `test/quint-speech-gate.test.mjs` (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17 | A7 | CLI entry (`process.argv[1]===…`) — no script or doc invokes it. | Delete. | L |
| 2 | – | P1 | Upstream-only model: runs on every Alpha change today. | Lane: `upstream.lock.json`, `NativeSpeechGate.qnt`, `SpeechGateTraces.java`, this file. Upstream follow-up candidate (D14). | – |

## Proposed end state
Unchanged harness without the CLI; run only from the native aggregate on its lane.
