# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkflowApprovalNoticeInstrumentedTest.java
- Lines: 183 | Role: Phone-step approval notices: builder redaction/expiry/channels (always), and in a runner-owned campaign the OS post, Ask action, tap route, owner-change fence and resume of approval notices. | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/android-workflow-native.ts:89,91,94,103` (four `{class,method,gate:'workflowApprovalNotice'}` cases). Text/path pins: those four method names (must not be renamed without the script), `test/native-campaign-evidence.test.mjs:5` (fully qualified class), evidence key `workflowReturnedTapDiagnostic_<phase>` (line 21; grep shows no reader outside this file).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-45 | C3 | `call()` promise bridge (`window.__approvalNotice`); 12 copies. | `WebViewTestDriver.call`. | Low. |
| 2 | 52, 158, 160 | C3 | Two notification lookups by tag in one file (`active()` returns first match, `row()` asserts uniqueness) plus `awaitGone`; the same `"alpha-workflow-"+id` tag lookup appears in `WorkflowApprovalNoticeProcessDeathInstrumentedTest:29-33`, `WorkflowNoticeProcessDeathInstrumentedTest:85-89,142-146`, `WorkflowNoticeTapInstrumentedTest:64,151`, `WorkflowNoticeOwnerFixture:38`. | One `WorkflowNoticeTestSupport.row(manager,id)` (unique, id 0) + `awaitGone`; delete `active()`. | Low. |
| 3 | 52, 99, 155, 158, 181 | C6 | Literal `"alpha-workflow-"` tag prefix (18 test occurrences across 5 files); production owns it in `WorkflowNoticePoster.java:13`. | Expose `WorkflowNoticePoster.TAG_PREFIX` (package-private) and use it in tests. | None. |
| 4 | 59, 157 | C3 | Fixture route JSON built inline at 59 and by `route(owner,run)` at 157; same builder in `WorkflowNoticeTapInstrumentedTest:62`, `WorkflowNoticeProcessDeathInstrumentedTest:104,168`, `WorkflowNoticeOwnerFixture:25`, `WorkflowApprovalNoticeProcessDeathInstrumentedTest:142`. | One `WorkflowNoticeOwnerFixture.route(JSONObject owner,String run)`; use at 59. | None. |
| 5 | 63, 124, 168, 172, 175 | C3 | Owner literal `{origin:"https://workflow-fixture.invalid",ownerId:"fixture-owner",agentId:"fixture-agent"}` written as escaped JS 4× and as JSONObject at 117. | Build once as `JSONObject OWNER` and interpolate `OWNER.toString()`. | None. |
| 6 | 72-74, 81-83, 89-90, 179 | C3 | Same "poll `pendingWorkflowTap()` until predicate" loop 4×. | `awaitPendingTap(Predicate<JSONObject>)` helper (also used by `WorkflowNoticeTapInstrumentedTest.pending`). | Low. |
| 7 | 15-22 | B5 | `returnedTapDiagnostic` (8 lines of ~400-char statements, dumpsys/window/ledger dump) runs only on a failing assertion path; result goes to instrumentation results nobody parses. | Keep only if the owner still investigates that flake; otherwise delete and rely on the assertion message (`"Returned tap response: "+pending`). | Low. |
| 8 | 26 | B4 | `new HostedNoticePoster(context);` constructed for side effect (channel creation) and discarded, to test `AlphaHostedResultsPlugin.CHANNEL` importance. | Keep but comment why; or call the channel-ensure method explicitly. | None. |
| 9 | whole | D8 | 20+ lines over 300 chars (e.g. 177, 179). | Formatter pass. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call` | helper | 41-45 | 12 files (see `VoicePermissionRevokeInstrumentedTest.java.md`) | `WebViewTestDriver.call` |
| `active` / `row` / `awaitGone` | helper | 52, 158, 160 | `WorkflowApprovalNoticeProcessDeathInstrumentedTest:29`, `WorkflowNoticeProcessDeathInstrumentedTest:85,142`, `WorkflowNoticeTapInstrumentedTest:64,151` | new `WorkflowNoticeTestSupport` (androidTest) |
| `route` | helper | 157 | `WorkflowNoticeTapInstrumentedTest:62` (identical shape), inline in 4 files | `WorkflowNoticeOwnerFixture.route` |
| `approvalId(char)` | helper | 23 | inline `"approval-"+"e".repeat(64)` in `WorkflowNoticeProcessDeathInstrumentedTest:164` | `WorkflowNoticeTestSupport` |
| `awaitSignedOutStartup` | helper | 47-51 | signed-out owner check in `WorkflowNoticeOwnerFixture.awaitOwner(false)` and `WorkflowApprovalNoticeProcessDeathInstrumentedTest:149` | `WorkflowNoticeOwnerFixture` static |

## Proposed end state
Four tests unchanged in behaviour and name; helpers (`call`, notice lookup, route/owner/approval ids, tap polling, signed-out wait) come from `WebViewTestDriver` and a shared `WorkflowNoticeTestSupport`; diagnostic dump removed. About 130 lines.

## Verification
`node scripts/android-workflow-native.ts --phase=approval-notice` (and the notification-granted phases) on flag-off and test-mocks archives; `node --test test/native-campaign-evidence.test.mjs`.
