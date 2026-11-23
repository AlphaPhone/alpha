# test/aosp-capabilities.test.mjs
- Lines: 58 | Kind: integration (javac of real Alpha + shared vendor Java with stub Android types) + tooling (overlay writer) + some source-text | Verdict: MERGE (test 1 into the Gradle JVM image-capability test, or `test/tooling/aosp.test.ts` until Gradle JVM tests exist; test 2 into `test/tooling/aosp.test.ts`, minus source-text lines)
- Covers: the compiled `AlphaImageCapabilities`/`AlphaImageCapability` adapters over the shared `ImageCapability` admit the image only when every fact holds, refuse debug/test-mocks/non-launcher builds, and keep dialer/SMS/contacts roles unavailable; the RRO writer produces the product overlay. Duplicates: `test/aosp-image-capability.test.mjs` test 5 asserts the same decision by regex over the vendor and Alpha Java (this file proves it by execution, so the regex copy goes). Callers/importers: `npm test`; imports `scripts/aosp-capability-overlay.ts`, `test/fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-45 | - | Genuine multi-class execution of the real decision; the best coverage of P-36 image admission in the repo. ~1-3 s javac. | Keep; move to the Gradle host-JVM test set when it exists (shared Android stub set instead of inline stubs). | none |
| 2 | 13-19 | C4 | Inline Android/BuildConfig/R stubs re-declared; the same stubs exist under `test/fixtures/*-jvm/android/**`. | Use the shared stub set when merging. | low |
| 3 | 51-52 | T1 | Reads the committed `res/values/aosp-capabilities.xml` and checks the default is false through `assertAlphaProvisioningDefault`, which has no caller outside this test (`git grep`: only its definition). | Either call `assertAlphaProvisioningDefault` from `verify-apks`/`stage-aosp` on the built resource (real gate) or delete both the export and these lines. | low (owner choice) |
| 4 | 53 | T1 | `stage.indexOf('if (!physical) writeAospCapabilityOverlay(output') > stage.indexOf('if (production) {')` pins statement order in `scripts/stage-aosp.ts`. | Delete. | none |
| 5 | 55-56 | T1 | Asserts the committed composition JSON equals a script constant. | Delete (constant equals constant). | none |

## Proposed end state
Test 1 (JVM admission) kept verbatim in behaviour, compiled against the shared stub set. Test 2 keeps only the overlay
rendering assertions (`writeAospCapabilityOverlay` output, `Invalid` refusal). No source-order or committed-constant checks.
