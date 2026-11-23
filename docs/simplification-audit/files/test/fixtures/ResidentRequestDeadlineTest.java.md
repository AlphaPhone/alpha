# test/fixtures/ResidentRequestDeadlineTest.java
- Lines: 165 | Kind: transplant template (the importer replaces the marker `// Production request methods.` at line 32 with four text ranges cut from `AlphaLocalAgentPlugin.java`, then compiles with stub `SystemClock`, `Log` and real `PluginWorkers.java`) | Verdict: DELETE (with `test/native-resident-request-deadline.test.mjs`)
- Covers: a local-agent request's explicit `timeoutMs` is validated before enrollment, spent across the worker queue and enrollment, capped at 120 s, defaults to 120 s, and does not weaken the owner (409) or lifecycle-epoch guards; an expired request drops its withdrawal identity. Duplicates: none exact. `specs/quint/refinement/native/HostedInboxTraces.java:99` and `RequestWithdrawalReplay.java` check the bound on other paths only. Callers/importers: only `test/native-resident-request-deadline.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32 | T2, D7 | Marker comment that exists so a test can paste product text in. The importer cuts four ranges by literal start/end strings (`' private static void logRequestFailure('` … `' /** Cancellation acknowledges transport closure'`, `' static String routeToken('`, `' private void requireCurrent('`, `' private void rejectPending('` … `'\n\n'`). | Delete. | — |
| 2 | 126-165 | T2 | Re-declares `PluginMethod`, `JSObject`, `PluginCall`, `Context`, `AlphaImageCapability`, `Assets`, `OwnerRoutes`, `PreparedViewNavigation`, `ElizaAgentService` so the pasted methods compile. | Goes with the file. | — |
| 3 | 56-124 | — | The cases are worth keeping: string/boolean/fraction/null timeout refused before enrollment; `-1/0/999` refused; expiry in queue; expiry during a 4 s enrollment; 600 000 capped to 119 500 after 500 ms; default 120 000; owner change gives 409; epoch change gives `LOCAL_AGENT_EPOCH_CHANGED`. | Carry them into a Gradle JVM test once the request-budget arithmetic (`remainingLocalRequestTimeout`, timeout parsing) is a small class of its own (part of the `AlphaLocalAgentPlugin` split, D1). | Medium: without that, no test covers the request deadline. |
| 4 | 123 | A8 | Output says "legacy dispatch budget" for what is the current default. | Goes with the file. | — |

## Proposed end state
Deleted. When `AlphaLocalAgentPlugin` is split, a `LocalAgentRequestBudget` (parse + remaining-time) gets the
eight cases of finding 3 in the Gradle `connection-cloud` JVM suite; owner/epoch guards stay with the resident
coordinator Quint replay.
