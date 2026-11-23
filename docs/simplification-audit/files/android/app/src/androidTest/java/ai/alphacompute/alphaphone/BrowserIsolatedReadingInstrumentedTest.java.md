# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserIsolatedReadingInstrumentedTest.java
- Lines: 38 | Role: page-world tampering with built-ins cannot forge a "safe" reading review; the isolated world is invisible to the page and its frames. | Verdict: KEEP (owner question on the `remote:` slot)
- Importers: none (uses `BrowserReadingFixture`).
- Text/path pins: `test/browser-reading-capability.test.mjs:58-61` reads this file and requires `typeof __elizaBrowserReadWorld==='undefined'` and `typeof frame.contentWindow.__elizaBrowserReadWorld==='undefined'` and no `__alphaBrowserReadWorld` (T1); `scripts/android-instrumentation.ts:206` (`args: {browserIsolatedReading:"1"}`, `requiresTestMocksBuild`) — runner test requires the exact gate text `"1".equals(InstrumentationRegistry.getArguments().getString("browserIsolatedReading")` (line 13); `scripts/ci/emulator-suite.ts:13,38` (READING_TEST_MOCKS_CLASSES); `test/ci-emulator-evidence.test.mjs:224,232,279`; `scripts/owner/emulator-campaign-check.ts:45,59`; `test/owner-emulator-campaign-check.test.mjs:21`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17, 23 | A3/P15 (owner) | Speech token written for slot `"remote:"+origin` — the paired-agent (`remote:`) mode the PRD excludes ("No hosted-agent pairing"); the reading fixture's read-aloud goes through paired speech. | Owner decision P15: if paired speech is retired, the read-aloud half of `cancelThenApproveOnce` must move to resident/cloud speech or be dropped. | Medium; owner. |
| 2 | 14-15 | — | Uses `assertTrue` for preconditions (build flavour, provider capability) where other gated classes use `Assume` — deliberate (registry routes it only to test-mocks + capable provider), so a wrong route fails loudly. | Keep. | — |
| 3 | 26-27 | T1 | The probes are pinned verbatim by `test/browser-reading-capability.test.mjs`; renaming the JS channel requires editing both. | Keep text or delete that host assertion (it only checks the Java text). | Low. |

## Local types and helpers
None local (all in BrowserReadingFixture).

## Proposed end state
Unchanged (~38 lines) unless the P15 decision removes paired speech.

## Verification
`--test-mocks --classes BrowserIsolatedReading` with an isolated-world WebView provider; CI `scripts/ci/emulator-suite.ts` reading lane. Host: `node --test test/browser-reading-capability.test.mjs test/ci-emulator-evidence.test.mjs`.
