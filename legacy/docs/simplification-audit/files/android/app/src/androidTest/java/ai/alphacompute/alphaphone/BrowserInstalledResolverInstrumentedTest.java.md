# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserInstalledResolverInstrumentedTest.java
- Lines: 29 | Role: on the device/image, at least one installed browser publishes a generic HTTPS filter visible to Alpha's package-visibility queries. | Verdict: KEEP (trim 2 lines)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:146`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27 | B5 | `InstrumentationRegistry.getInstrumentation().addResults(receipt)` with key `installedGenericHttpsBrowsers`; whole-repo grep: no reader (scripts/instrumentation-result.ts does not parse it). | Delete the receipt, or put the list in the assertion message only. | None. |
| 2 | 23 | — | Eligibility filter (not self, exported, enabled, app enabled) duplicates the rule upstream `BrowserExternalHandoff` applies at runtime; only `genericHttps` is shared. | Acceptable for a device check; keep. | — |
| 3 | 15 | — | Overlaps BrowserExternalHandoff's filter unit test (that one moves upstream; this one stays as the real-device check). | — | — |

## Local types and helpers
None.

## Proposed end state
~27 lines; same assertion without the unread receipt.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes BrowserInstalledResolver`.
