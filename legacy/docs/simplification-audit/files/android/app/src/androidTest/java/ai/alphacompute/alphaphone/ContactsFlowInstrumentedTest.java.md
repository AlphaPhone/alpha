# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ContactsFlowInstrumentedTest.java
- Lines: 67 | Role: `@Ignore`d journey: seeded provider contact shows in the prototype Contacts view; New contact form writes one verified provider contact. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:331` `NOT_RUN_BY_A_RUNNER.ContactsFlow` ("@Ignore: Contacts is deferred from the MVP"); `test/android-instrumentation-runner.test.mjs:203-205` (entry must match a class).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-19 | T9 / P20 | `@org.junit.Ignore("MVP-DEFERRED: Contacts provider is not packaged in the MVP")` — permanently skipped, no runner | Delete file + NOT_RUN entry; restore from git when Contacts returns (PRD AP-08 keeps Contacts for the AOSP image, P-60 defers it) | None |
| 2 | 51, 60 | A5 | Drives a `Contacts` view through the renderer (`AppNavigation.request("Contacts")`) whose form ("New contact", "Save") the MVP does not ship | — (deleted) | — |
| 3 | 22-32 | C3 | Private `eval`/`until`/`click`/`fill` | — (deleted) | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `rawIds`/`has` | helper | 33-39 | ContactsCatalog inline inserts | deleted |

## Proposed end state
Deleted. 67 -> 0 lines.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`.
