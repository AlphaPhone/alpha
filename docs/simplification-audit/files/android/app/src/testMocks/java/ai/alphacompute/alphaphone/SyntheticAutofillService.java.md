# android/app/src/testMocks/java/ai/alphacompute/alphaphone/SyntheticAutofillService.java
- Lines: 54 | Role: test-mocks-only AutofillService that, while armed by instrumentation, offers one synthetic credential for `https://example.com` username/password fields and counts requests. | Verdict: KEEP (small SIMPLIFY)
- Importers: `testMocks/AndroidManifest.xml:14`; `BrowserAutofillInstrumentedTest.java` (static `armed`, `accepted`, `rejected`, `requests`, `LABEL`, `USER`, `PASSWORD`; component string line 137). Text/path pins: `scripts/apk.ts:78` (`DEVELOPMENT_CLASSES` — must be absent from distribution dex), `scripts/scan-archived-apks.py:40`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-38 | C3 (local) | Two parallel blocks assign `result.user` / `result.password` — once from `getAutofillHints()` (`"username"`, `"current-password"`/`"password"`), once from HTML `autocomplete` attributes (`"username"`, `"current-password"`). | One `assign(Fields,AutofillId,String token)` used by both loops (~4 lines saved). | Low |
| 2 | 42-43 | — | `if(armed)requests.incrementAndGet(); if(!armed || …)` — two checks of `armed`; acceptable (counts only armed requests by contract, documented at 17). | — | — |
| 3 | 14-18 | D3 (test-only) | Public static mutable counters as the test channel. Acceptable for a test-mocks-only service that instrumentation reads in-process. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Fields` | type (class) | 22 | — | keep local |
| `fields(...)` | helper | 23-40 | upstream `BrowserLoginFields` solves field discovery for the product path (different purpose) | keep local |

## Proposed end state
~50 lines, behaviour unchanged.

## Verification
`node scripts/android-instrumentation.ts --test-mocks --classes BrowserAutofill` (`scripts/android-instrumentation.ts:160`); `verify-apks` (class absent from distribution APKs).
