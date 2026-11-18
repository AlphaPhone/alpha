# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkflowNoticeOwnerFixture.java
- Lines: 100 | Role: Test-mocks-only fixture: persists a synthetic loopback owner identity in SharedPreferences, runs a tiny HTTP server on 127.0.0.1 answering `/api/auth/me` and `/api/agents`, signs the renderer in through its real restore path, and (prepare phase) posts one approval through the main bridge, recording the publication. | Verdict: SIMPLIFY
- Importers: 4 — `WorkflowApprovalNoticeProcessDeathInstrumentedTest`, `WorkflowNoticeProcessDeathInstrumentedTest`, `WorkflowNoticeTapInstrumentedTest`, and (prepare phase) the campaign runners. Text/path pins: `scripts/ci/pending-recovery-ui.py:25` comment; arg `workflowOwnerPhase=prepare` pinned by `test/native-campaign-evidence.test.mjs:48` and `scripts/ci/test-pending-recovery-phases.py`. PREFS name `workflow-owner-restore-fixture` and keys `identity`/`token`/`approval`/`publication` are read across the prepare→run process boundary — keep.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16 | C6 | `OWNER_SLOT="workflow-notice-owner:v1"` duplicates production `WorkflowNoticeTaps.OWNER_SLOT` (`WorkflowNoticeTaps.java:9`); `WorkflowApprovalNoticeProcessDeathInstrumentedTest:136,141,149` use this copy while `WorkflowApprovalNoticeInstrumentedTest`/`WorkflowNoticeTapInstrumentedTest` use the production one. | Delete the constant; reference `WorkflowNoticeTaps.OWNER_SLOT` everywhere. | None. |
| 2 | 21, 54, 79 | B4 | `Assume.assumeTrue(...ELIZA_DEV_ALLOW_TEST_MOCKS)` three times inside the fixture (prepare → seed, constructor) and again in every calling test before `prepare()`. | Keep one assume in the constructor and one in `seed`; drop from `prepare` (it calls `seed`). | None. |
| 3 | 44-47 | B5 | Prepare phase dumps `dumpsys activity intents` into instrumentation result `workflowOwnerPreparedIntentSender`; no reader (`git grep workflowOwnerPreparedIntentSender -- scripts test`: 0). | Delete lines 43-47. | None. |
| 4 | 48-49 | D8 | Two stray blank lines inside the try block. | Delete. | None. |
| 5 | 32-36 | C3 | Promise-to-global `window.__fixtureApprovalPost` poll — another `call()` copy. | `WebViewTestDriver.call` (note: "never retry" semantics are preserved by a single call). | Low. |
| 6 | 25 | C3 | Route builder (`new JSONObject(identity).put("scope","a".repeat(64)).put("workflowId","fixture-flow")...`) — same as `WorkflowNoticeTapInstrumentedTest:62` and 4 inline copies. | Add `static JSONObject route(JSONObject owner,String run)` here; callers use it. | None. |
| 7 | 82-92 | D8 / D9 | Ten-line HTTP server loop compressed into 3 physical lines of ~600 chars with nested parsing. | Split into `handle(Socket)` with early returns; same responses. | Low. |
| 8 | 97 | D8 | `awaitOwner` predicate is one ~700-char line. | Extract `ownerMatches(JSONObject)` predicate. | None. |
| 9 | 59, 69, 97 | C6 | `"remote:"+origin` credential slot prefix literal (also `WorkflowNoticeTapInstrumentedTest:63`, `WorkflowApprovalNoticeProcessDeathInstrumentedTest:122`). This is a paired-agent (`remote:`) credential, which research P15 flags as PRD-excluded hosted pairing. | Reference the production constant; if P15 deletes `remote:` connections, the fixture must restore its owner through the remaining (`local`/resident) path — coordinated change. | High if P15 lands: the whole owner fixture depends on a `remote:` session. Owner question. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `OWNER_SLOT` | const | 16 | `android/app/src/main/.../WorkflowNoticeTaps.java:9` | delete; use production |
| `PREFS` | const | 16 | used by `WorkflowNoticeTapInstrumentedTest:63` | keep |
| loopback HTTP peer | class (inline thread) | 82-92 | other loopback fixtures in androidTest (e.g. `InboxFixtureConnection`) | keep; consider a shared `LoopbackJsonServer` if a third copy exists |
| `route` (to add) | helper | 25 | `WorkflowNoticeTapInstrumentedTest:62`, `WorkflowApprovalNoticeInstrumentedTest:157` | here |

## Proposed end state
Same public surface (`preparing`, `prepare`, `seed`, `signIn`, `approval`, `publication`, `awaitOwner`, `close`) plus `route()`; production `OWNER_SLOT`; no intent dump; readable server handler. About 85 lines.

## Verification
`python3 scripts/ci/pending-recovery-ui.py` phases `workflow-notice-tap`, `workflow-notice-ask`, `workflow-notice-process-death`, `workflow-approval-process-death`; `node scripts/android-workflow-native.ts --phase=approval-notice-recovery`; `python3 scripts/ci/test-pending-recovery-phases.py`; `node --test test/native-campaign-evidence.test.mjs`.
