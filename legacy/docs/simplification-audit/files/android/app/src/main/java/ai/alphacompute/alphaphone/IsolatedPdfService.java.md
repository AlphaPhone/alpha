# android/app/src/main/java/ai/alphacompute/alphaphone/IsolatedPdfService.java
- Lines: 14 | Role: Manifest name for the shared isolated-process PDF renderer with a dev-only watchdog stall fixture. | Verdict: KEEP
- Importers: Manifest; `AlphaMailPdfActivity`, `SelectedDocumentAccess`; proguard keep. Text/path pins: `android/app/proguard-rules.pro`; `specs/quint/services/{README.md,manifest.json}`; `specs/quint/refinement/services/{ServicePdfTraces.java,pdf.mjs}`; `test/note-source-references.test.mjs`; androidTest `IsolatedPdfInstrumentedTest`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | D6 | `stallFixture` test hook in main, gated by `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS`. | Acceptable (gated per AGENTS.md). Optional: move the override to the testMocks source set so production bytecode carries no fixture string. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
Unchanged. Estimated lines after: 14.

## Verification
androidTest IsolatedPdf; `scripts/audit-production-bundle.ts` n/a (Java).
