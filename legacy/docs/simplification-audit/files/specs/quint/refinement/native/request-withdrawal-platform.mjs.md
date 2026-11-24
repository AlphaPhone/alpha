# specs/quint/refinement/native/request-withdrawal-platform.mjs
- Lines: 181 | Kind: refinement platform builder (Java source surgery on `AlphaLocalAgentPlugin.java`, re-hosted in a hand-written `WithdrawalHost`) | Verdict: PORT
- Covers: Builds a host class that contains the real request admission, deadline guard, worker body, ownership guard, `invalidateOwnCalls` and `rejectPending` copied out of `AlphaLocalAgentPlugin`, with enrollment/transport/owner methods replaced by latched ports. Duplicates: none live (its comment cites a "native-request-cancel" harness that no longer exists). Callers/importers: only `native/request-withdrawal.mjs:12`.

Product text read: `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java`. Anchors: regex `workers=Executors\.newFixedThreadPool\(2\)`; `' @PluginMethod public void request('`; `' private void requireCurrent('` … `'\n\n'`; `' private void invalidateOwnCalls(){'` … `' /** Runtime lifecycle changes'`; `' private static final int LOCAL_REQUEST_TIMEOUT_LIMIT_MS='` … `' @PluginMethod public void request('`; `'  final Long deadline;'` … `'  JSONObject headers=call.getObject("headers");'`; `'  JSONObject headers=call.getObject("headers");\n  final String cancelId='` … `' /** Cancellation acknowledges transport closure'`; the line starting `' private void rejectPending('`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-27, 114-121 | T10 | Seven anchors (some with exact indentation and a comment) into the largest Java god module (`AlphaLocalAgentPlugin`, 1.4k lines, D1 split planned). Any split, reformat or comment edit breaks it. | Extract the plain-request path into a package-private class (e.g. `LocalAgentRequests`: admission, deadlines, worker body, withdrawable map, `cancelRequest`, `invalidateOwnCalls`) with a small port interface (`enroll`, `raw`, `requireProviderOwner`, `clearEnrollment`, executor). `AlphaLocalAgentPlugin` delegates to it; the harness compiles it whole and supplies the ports. This lines up with the planned `AlphaLocalAgentPlugin` split. | High |
| 2 | 11 | A8 | Comment refers to "native-request-cancel", which does not exist (`git grep` finds only this line). | Delete. | None |
| 3 | 180 | A7 | `sourceSha256` returned but never read by `request-withdrawal.mjs`. | Delete. | None |
| 4 | 34-41 | C5 | Local `JSObject`/`PluginCall`/`PluginMethod` stand-ins. | Shared Capacitor stubs. | Low |

## Proposed end state
After the extraction: a ports class (~60 lines of Java, ideally a checked-in `WithdrawalPorts.java` instead of a template string) and no reads of product text.
