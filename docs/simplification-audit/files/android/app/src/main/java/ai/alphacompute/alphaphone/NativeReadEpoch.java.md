# android/app/src/main/java/ai/alphacompute/alphaphone/NativeReadEpoch.java
- Lines: 11 | Role: atomic epoch + scope comparison meant to invalidate queued native media results | Verdict: DELETE
- Importers: none in `android/` (git grep: 0 hits outside this file). Text/path pins: `test/native-read-epoch.test.mjs` (javac-compiles it; also regexes upstream media sources), `test/fixtures/NativeReadEpochTest.java`, `specs/quint/native/manifest.json`, `specs/quint/native/README.md`, `specs/quint/refinement/native/{ComponentTraces.java,README.md,index.mjs}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-11 | A7 / D7 | No product caller; media plugins use their own epochs upstream (`docs/formal-model-audit-2026-11/07-native.md:38` already notes it). Exists only for its host test and Quint `ComponentTraces`. | Delete the file, `test/fixtures/NativeReadEpochTest.java`, the javac part of `test/native-read-epoch.test.mjs` (keep or move the upstream-media regex assertions only if still wanted — they are T1), the manifest entries and `ComponentTraces` usage. | None for the product. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `NativeReadEpoch` | class | 4-11 | epoch fences (~30, C4) | deleted |

## Proposed end state
File removed.

## Verification
`npm run verify` (Quint native manifest check and feature-parity list updated).
