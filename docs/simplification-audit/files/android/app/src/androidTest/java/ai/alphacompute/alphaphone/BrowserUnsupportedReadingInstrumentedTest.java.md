# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserUnsupportedReadingInstrumentedTest.java
- Lines: 33 | Role: on a provider without isolated-world injection, the review refuses without touching the page | Verdict: DELETE
- Importers: none. Registry `BrowserUnsupportedReading` (`scripts/android-instrumentation.ts:243`, test-mocks build + no-isolated-world provider). Not in any CI lane: `test/ci-emulator-evidence.test.mjs:234` asserts it is *excluded* from `READING_CLASSES`/`READING_TEST_MOCKS_CLASSES`. Text/path pins: that assertion, the registry entry.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-32 | T4 | Same claim as `BrowserReadingNavigationInstrumentedTest.providerWithoutIsolatedWorldSaysReadingIsUnavailableAndInjectsNothing` (refusal before extraction, no main-world channel), which runs in CI on the flag-off pair and also checks the product surface. The extra "no outbound speech" checks (25, 27) are implied by a refused review. | Delete the class, its registry entry and the exclusion assertion in `test/ci-emulator-evidence.test.mjs:234`. | Low |
| 2 | 16, 22 | A3 / P15 | Paired `remote:` speech slot used only to prove nothing is sent. | Gone with #1. | — |

## Local types and helpers
None.

## Proposed end state
File deleted (−33 lines); registry −1 line; one assertion removed from `test/ci-emulator-evidence.test.mjs`.

## Verification
`node --test test/android-instrumentation-runner.test.mjs test/ci-emulator-evidence.test.mjs`; `BrowserReadingNavigation` on a no-isolated-world emulator keeps the coverage.
