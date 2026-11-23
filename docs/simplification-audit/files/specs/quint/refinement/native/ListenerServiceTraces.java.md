# specs/quint/refinement/native/ListenerServiceTraces.java
- Lines: 104 | Kind: Quint refinement harness (vendored `ListeningService`/`Listener`/`ListenerStore`/`ListeningEpoch`/lease/policy with Android, AudioRecord, ASR as ports) | Verdict: KEEP (absorbs the two probes; gate on upstream)
- Covers: listener service lifecycle: create/start/load, durable marker write failure, pause/disable/destroy with stop/release failures, retained resource refuses replacement, release retry, reopen, late start after destroy, destroy/pause while the engine loads. Duplicates: `ListenerServiceProbe.java` and `ListenerAdmissionProbe.java` (subsets; both DELETE). Callers/importers: `listener-service.mjs` `checkListenerService`, native aggregate, `test/quint-listener-service.test.mjs` test 1.
- Model live: `NativeListenerService` (vendored sense only). D7 keeps the feature.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 96-103 | C3 | Self-spawning `campaign` branch duplicates `javaTraceCampaign`. | Driver uses `javaTraceCampaign(…, scenarios.map(s=>[join(state,s+'.json'), s]))`; delete the branch. | low |
| 2 | 15-34 | T10 | Reads private service fields `recognizer`, `destroyed`, `reapply`, `indicatorCheck`, `leaseCheck`, `analyse`, `capture`, `record`, `engine` and epoch internals. | Keep; gate on upstream changes. | low |
| 3 | — | T4 | After deleting the probes, the test file keeps one test; the native aggregate runs the same campaign again. | One runner. | — |

## Proposed end state
Single listener-service campaign (14 scenarios) run via `javaTraceCampaign`; probes gone; runs only when upstream pin, patches, `android/sense/**`, model or harness change.
