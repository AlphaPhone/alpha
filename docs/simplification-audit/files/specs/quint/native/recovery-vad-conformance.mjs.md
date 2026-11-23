# specs/quint/native/recovery-vad-conformance.mjs
- Lines: 160 | Kind: Quint conformance harness (ITF traces replayed through real Java, compiled with `javac`) | Verdict: KEEP (split VAD half, SIMPLIFY)
- Covers: model-generated traces of `RendererRecovery` and `VadSegmentation` replayed through the real `RendererRecoveryBudget.java` (app) and `LiveVadGate.java` (`vendor/eliza/plugins/plugin-local-inference/...`). Duplicates: none (no host or instrumentation test drives `RendererRecoveryBudget` traces). Callers/importers: `test/quint-recovery-vad-conformance.test.mjs` (only runner), `package.json` `quint:conformance` alias (research: alias only referenced from README, delete), free-text mention in `specs/quint/native/manifest.json:959`, `docs/formal-model-audit-2026-11/07-native.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-12, 147-148 | (good) | Compiles the unmodified product Java files and calls their public API; no text slicing. This is the shape other harnesses should be ported to. | Keep. | – |
| 2 | 100-102, 119-122, 134-135 | T10 (mild) | Reflection on private fields `started`, `windowStart`, `lossesInWindow`, `above`, `below` pins private member names. | Acceptable; if either class gains package-private getters for other reasons, use them. Do not add getters only for this. | Low |
| 3 | 12, 79-80, 124-135 | P6 / §2.9 upstream modelled in consumer | `VadSegmentation` has `"sources": []` in the manifest and models only `vendor/eliza` `LiveVadGate`. It can change only on an upstream pin bump but runs on every PR via `npm test`. | Move the VAD half (model + replay) upstream, or select it only when `upstream.lock.json` changes. Keep `RendererRecovery` here. | Low |
| 4 | 140 | T1-like constant assertion | `LiveVadGate.WINDOW==512&&START_WINDOWS==2&&...` checks upstream constants, not behaviour; trace replay already exercises their effect. | Delete line 140. | None |
| 5 | 22-34 | C3 | `jdkTool()` re-implements Java discovery that `specs/quint/refinement/native/java.mjs:14` `executable()` already provides (and `specs/quint/native/conformance.mjs` has a third copy). | Import `executable` from `refinement/native/java.mjs` (or one shared `java.mjs`). | Low |
| 6 | 36-44 | C3 | `decode()` ITF decoder duplicates `plain()` in `refinement/application/browser-model-traces.mjs` and the decoder in `check-traces.mjs`. | Use one shared ITF decoder. | Low |
| 7 | 151-152 | B5 | Returns sha256 of each Java source; nothing reads it (the test reads only counts). | Drop `sources` hashes and `createHash` import. | None |
| 8 | 85, 150 | B5 (mild) | `states > 1000`, `checks > 1000` floors. Keep as `> 0` style sanity only. | Keep or relax; not exact counts, so tolerable. | – |
| 9 | 15-20 | C3 | `run()` spawn helper; `scripts/child-command.ts` exists. | Optional reuse. | Low |

## Proposed end state
Keep the file as the RendererRecovery Java conformance replay (~120 lines): shared Java discovery and ITF decode helpers,
no hash return, no constant assertion. Move `VadSegmentation` replay with its model upstream (or gate it on
`upstream.lock.json` changes in the path matrix). The wrapper test becomes one entry in the single manifest-driven
`test/quint-refinement.test.mjs` runner; delete the `quint:conformance` npm alias. Runtime: two Quint runs + javac +
JVM (~10-20 s); belongs in the formal lane, selected when `RendererRecoveryBudget.java`, the model, or the upstream pin changes.
