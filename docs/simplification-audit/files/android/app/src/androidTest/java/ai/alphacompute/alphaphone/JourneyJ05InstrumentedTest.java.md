# android/app/src/androidTest/java/ai/alphacompute/alphaphone/JourneyJ05InstrumentedTest.java
- Lines: 56 | Role: journey J05 composed from `BrowserPageQuestionInstrumentedTest` steps: page -> Ask about page -> review -> composer -> Send (nothing dispatched) -> source note survives recreation. | Verdict: KEEP (owner question: it skips on every runner it has today)
- Importers: none (it calls into `BrowserPageQuestionInstrumentedTest` public steps). Text/path pins: `scripts/android-instrumentation.ts:238` (`flagOffOnly: true`, arg `journeyJ05`); `test/android-instrumentation-runner.test.mjs:628-643` (gate name, flagOffOnly, and a regex over the source that it contacts no public host — T1).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-24, 32-33 | T9 | Javadoc states the emulator's WebView 133 lacks isolated-world injection and that a signed-out flag-off build blocks with the P-43 sign-in, so `assumeIsolatedReading()`/`assumeNoRequiredSignIn()` skip; the class can only skip on the emulator it is registered for. | Owner: keep as a device-only journey (document the device runner) or delete. A journey test is the kind the owner brief keeps, so default is keep. | Medium |
| 2 | 47-53 | C3 | Inline primary/suppressed cleanup block (same as 4 other files). | Shared `Cleanup` helper. | Low |
| 3 | 34 | D10 | Instantiates another test class (`new BrowserPageQuestionInstrumentedTest()`) to reuse its steps. | Move the shared steps into a `BrowserPageQuestionSteps` helper class. | Low |
| 4 | 22-24 | A8 | "On a signed-in phone ... the 'nothing is dispatched' step needs re-scoping before that run." — a to-do in Javadoc. | Keep as a note only if the class is kept. | None |

## Local types and helpers
None local.

## Proposed end state
Same journey, using a `BrowserPageQuestionSteps` helper and the shared cleanup helper; about 45 lines. Deleted entirely if the owner rejects device-only journeys.

## Verification
`npm run test:android:instrumentation -- --owned-emulator ... --classes JourneyJ05` (flag-off); `node --test test/android-instrumentation-runner.test.mjs`.
