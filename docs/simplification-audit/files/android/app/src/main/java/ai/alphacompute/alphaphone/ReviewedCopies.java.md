# android/app/src/main/java/ai/alphacompute/alphaphone/ReviewedCopies.java
- Lines: 76 | Role: process-wide registry of reviewed attachment copies in the shared cache: write-then-register, per-owner revoke, startup/expiry sweep | Verdict: KEEP
- Importers: `AlphaMailAttachmentsPlugin` (1 construction). Text/path pins: `test/fixtures/ReviewedCopiesTest.java`, `test/native-plugin-teardown.test.mjs`, `specs/quint/native/{ReviewedCopies.qnt,manifest.json}`, `specs/quint/refinement/native/{ReviewedCopiesTraces.java,reviewed-copies.md,reviewed-copies.mjs}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-12 | — | "Two bridges share Alpha's attachment cache": the class is constructed once per `AlphaMailAttachmentsPlugin` instance (`:41`), and plugin instances are per Activity/bridge (MainActivity, the disabled `AlphaAssistActivity`, a second hand-off instance), so the per-owner model is needed. `GRANT_MILLIS` is also read by `AlphaMailFileProvider:12`. | Keep. If P-78 retires `AlphaAssistActivity` and the hand-off guarantees one bridge, the cross-owner branch (71) could go — not worth it alone. | — |
| 2 | 29-30 | C3 | File-name validation (`/`, `\\`, `\0`, length 255) — similar checks in `AlphaFilesPlugin`/`AlphaMailAttachmentsPlugin`? | Shared `SafeNames.require` if a twin is confirmed. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Copy` | class | 18-22 | — | here |
| `GRANT_MILLIS` | const | 14 | — | here |

## Proposed end state
Unchanged (~76 lines).

## Verification
`test/fixtures/ReviewedCopiesTest.java`, Quint `ReviewedCopies` refinement, mail attachment instrumentation.
