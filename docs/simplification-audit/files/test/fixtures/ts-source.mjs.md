# test/fixtures/ts-source.mjs
- Lines: 13 | Kind: test helper (type strip with esbuild fallback) | Verdict: MERGE into `test/support/strip-types.mjs` (then delete this file)
- Covers: none directly. Duplicates: `test/support/strip-types.mjs` is the same function (only comments and whitespace differ; diff confirmed). Callers/importers: `test/canonical-notes-webview-abort`, `cloud-protocol-error-copy`, `local-speech-native-drain`, `share-panel-adapter` (all research DELETE) and the live Quint harness `specs/quint/refinement/native/renderer-speech-chunk.mjs:15`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | C3 | Byte-equivalent duplicate of `support/strip-types.mjs`. | Point `renderer-speech-chunk.mjs` at `test/support/strip-types.mjs`; delete this file. Once the T10 harness port lands, the strip helper itself should have no remaining caller. | none |

## Proposed end state
Gone. One type-strip helper remains only while text-slicing Quint harnesses do; it is deleted with the last of them.
