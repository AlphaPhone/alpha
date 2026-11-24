# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaActionJournalPlugin.java
- Lines: 137 | Role: Capacitor plugin `AlphaActionJournal` (subclass of shared `ActionJournalPlugin`) adding receipt recovery (notification, deletion, reminder) and the native Clock review/confirm/cancel flow. | Verdict: SIMPLIFY
- Importers: registered in `MainActivity`; renderer `apps/app/src/runtime/clock-agent-review.ts`, `connection-ui.tsx` and ~30 Playwright specs name the plugin. Text/path pins: `specs/quint/native/manifest.json:2465,2909`, `specs/quint/refinement/native/{ActionRecoveryTraces.java,ClockReviewTraces.java,action-recovery-platform.mjs,clock-review-platform.mjs,clock-review.mjs}`, `test/native-plugin-teardown.test.mjs`, `test/plugin-worker-guard.test.mjs`, `test/shared-deletion-window.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-25 | C3 / C4 | Hand-built `new WorkflowNoticeDelivery(new WorkflowNoticeDelivery.Storage(){...},new WorkflowNoticePoster(getContext()))` is byte-for-byte what `WorkflowNoticeTapsFactory.delivery(Context)` (WorkflowNoticeTapsFactory.java:6) already returns. | `WorkflowNoticeDelivery delivery=WorkflowNoticeTapsFactory.delivery(getContext());` (-1 line, -1 anonymous adapter). | Low; Quint `action-recovery-platform.mjs` may stub `WorkflowNoticeDelivery` — check its harness. |
| 2 | 20-21 | D4 | `private static JSONObject read(ActionJournal journal,String scope,String id){return journal.get(scope,id);}` and `response(entry){return entryResponse(entry);}` are pure renames. | Inline `store.get(scope,id)` / `entryResponse(...)`. | Low; Quint harness may slice by name. |
| 3 | 89, 126 | C3 | Same triple parse `field(call.getString("scope"),"[a-f0-9]{64}"),id=field(..."proposalId","[A-Za-z0-9_-]{1,128}"),operationId=field(...)` twice; the `"[A-Za-z0-9_-]{1,128}"` literal appears 4x (89, 114, 126). | `private record ClockKey(String scope,String id,String operationId)` parsed by one helper; regex constant. | Low |
| 4 | 32, 44 | C6 | Op-type sets `Set.of("calendar_delete","reminder_cancel")` and the six reminder ops duplicated from `AlphaActionJournal.java:42,70`. | Use `AlphaActionJournal.REMINDER_OPS` constant. | Low |
| 5 | 79-86 | A8 | Javadoc narrates a past crash ("A Clock call the page made just before that can arrive afterwards; the stopped executor then throws ... which ends the process"). The same rationale is repeated in `AlphaDevicePlugin:155-160` and `AlphaCloudSignInPlugin:84`. | One line: "Rejects calls that arrive after teardown." The mechanism belongs to `PluginWorkers` (P18/P10). | None |
| 6 | 111, 134 | B1 | `catch(Exception refusal){call.reject("Exact approved Clock review unavailable");}` / `catch(Exception uncertain){...}` — catch-all to fixed message, cause discarded. | Keep the fixed user copy, but log `refusal.getClass().getName()` (one per-plugin reject helper, cross-file). | Low |
| 7 | 104-108 | D8 / D9 | Accept callback: nested lambda inside `PluginWorkers.submit` inside `ClockAgentReview.show` inside `clockUi`, ~600 chars on 4 lines. | Extract `onClockDecision(store,scope,id,operationId,approved,accepted,call)`. | Low |
| 8 | 55-63 | — | `clockUi` main-thread Future with 5 s timeout: specific to Clock dialog; keep. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `read`, `response` | helper (rename) | 20-21 | — | inline |
| anonymous `WorkflowNoticeDelivery.Storage` | adapter | 25 | `WorkflowNoticeTapsFactory.storage` (:4) — identical | use `WorkflowNoticeTapsFactory.delivery` |
| `clockUi` | helper | 56-63 | main-thread callable patterns in `AlphaDevicePlugin`, `AlphaDeletionsPlugin` (runOnUiThread) | keep |
| `clockWork` | helper | 84-86 | `AlphaDevicePlugin.diagnostics` (:161), `AlphaCloudSignInPlugin.recovery` (:85), `AlphaConnectionPlugin.submit` (:132) — all `PluginWorkers.submit(worker,task,()->call.reject(msg))` | base-plugin `background(call,work,msg)` |
| id regex `"[A-Za-z0-9_-]{1,128}"` | const | 89,114,126 | `AlphaCalendarPlugin:68` | `Ids` util |

## Proposed end state
~120 lines: no pass-through renames, delivery from `WorkflowNoticeTapsFactory`, shared op-type constants, one Clock key parser, the accept callback extracted, a one-line teardown comment. Clock and recovery semantics unchanged.

## Verification
`ClockAgentReviewInstrumentedTest`, `ActionJournalInstrumentedTest`; Quint `action-recovery`, `clock-review` refinements; `test/plugin-worker-guard.test.mjs`, `test/native-plugin-teardown.test.mjs`; Playwright `agent-clock-handoff.spec.ts`, `proposal-recovery.spec.ts`.
