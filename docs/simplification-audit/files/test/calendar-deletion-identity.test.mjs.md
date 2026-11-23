# test/calendar-deletion-identity.test.mjs
- Lines: 30 | Kind: unit on host JVM (javac of product `CalendarDeletionIdentity.java` with an inline Java test written from a JS template string) | Verdict: KEEP, move to Gradle JVM test `android/app/src/test/java/ai/alphacompute/alphaphone/CalendarDeletionIdentityTest.java`
- Covers: native scoped deletion identities (`delete2:<id>:event|series|occurrence:<t>`) parse exactly and a numeric id can never widen to a series; 19 malformed forms refused. Duplicates: none on host; device path via `test/browser/native-calendar-deletion-routing.spec.ts` (renderer side). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-26 | T9 / C3 | Java test source embedded in a JS template, own mkdtemp/javac/java. | Plain JUnit file in the Gradle test source set. | None |
| 2 | 17 | A1? | `parse("42")` produces `legacy=true` (pre-`delete2` wire form). If the renderer no longer emits numeric ids, this is a legacy reader (D1). | Owner/implementer check: grep the renderer for the numeric form; if none, delete the legacy branch and this row. | Low |
| 3 | 23 | - | Malformed table is a trust-boundary parser (renderer → native). Worth keeping. | Keep. | None |

## Proposed end state
One JUnit class in the Android unit-test source set, run by Gradle with the other calendar JVM tests. The JS wrapper is
deleted. The numeric legacy identity is removed if the renderer never sends it.
