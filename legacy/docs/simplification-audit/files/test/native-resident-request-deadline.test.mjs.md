# test/native-resident-request-deadline.test.mjs
- Lines: 40 | Kind: transplant on the JVM (four marker slices of `AlphaLocalAgentPlugin.java` substituted into `test/fixtures/ResidentRequestDeadlineTest.java` at the `// Production request methods.` marker) | Verdict: DELETE now; REWRITE in `test/integration/android-jvm.test.mjs` once request admission is its own class
- Covers: a native local-agent request spends its explicit deadline across queueing and enrollment before issuing the IPC request. Duplicates: Quint native request models (`request-withdrawal`, `native-stream-bridge`) cover ordering, not this budget. Callers/importers: `npm test` glob; sole importer of `ResidentRequestDeadlineTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-21, 33 | T2, T10 | Markers `private static void logRequestFailure(`, `static String routeToken(`, `private void requireCurrent(`, `private boolean runtimePackaged()`, `private void rejectPending(` pin plugin layout; blocks the D1 split. | Delete; extract `LocalAgentRequests` (deadline, admission, withdrawal, stream cap) from the plugin in the split. | Medium: the deadline budget loses host coverage until the rewrite. |

## Proposed end state
After the plugin split: committed fixture calls the real `LocalAgentRequests` with a fake clock and transport; cases:
deadline consumed by queue wait, by enrollment, request refused when exhausted. Fixture template deleted now.
