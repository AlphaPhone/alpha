# specs/quint/refinement/native/JournalTraces.java
- Lines: 168 | Kind: Quint refinement harness, three unrelated components in one class (upstream `DeferredDeletionJournal`/`DeletionDeadline`, upstream `SmsSendJournal`, upstream `BufferedStreamExchange`) | Verdict: KEEP, SIMPLIFY (split per model, fix manifest/source mismatch)
- Covers: deferred-deletion journal (stage/expire/undo, lost receipt, stale owner, reload) → `DeletionJournal`; SMS send journal (review/dispatch/sent/delivery, reload) → `DeviceActions`; voice IPC streaming exchange (success, missing completion, transport error, malformed, bounds, occupied, guard, replacement) → `VoiceIpcAssembly`. Duplicates: `SmsSendJournal` is executed in full by `SmsDispatchTraces`/`MmsDispatchTraces` (NativeSmsDispatch/NativeMmsDispatch); `DeferredDeletionJournal` by `DeletionCoordinatorTraces` and androidTest `ScopedCalendarDeletionInstrumentedTest`. Callers/importers: inline campaign `JournalTraces` in `index.mjs:132-147` (no per-model test).
- Models live: `DeletionJournal`, `DeviceActions`, `VoiceIpcAssembly` are in `specs/quint/native/manifest.json`; the exercised classes are product-reachable (`AlphaDeletionsPlugin`, `AlphaLocalAgentPlugin:989-1003`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-33, 60-61, 85-86 | T10 (weak refinement) | Several steps record observations the harness invents rather than reads from source: `trace.step("stage", Trace.fields("phase","queued"))`, `ownerChanges`, `expireWindow`, `reboot`, `admitImage`. They satisfy the model by construction. | Observe via `deletion(journal, …)`/`sms(journal, …)` after each step, or mark them as environment-only `stutter`/macro steps so the receipt does not claim a source observation. | medium (receipt honesty) |
| 2 | whole | D1 / C5 | Three models, three source sets, one class and one inline 15-line campaign in `index.mjs`. | Split into `DeletionJournalTraces`, `SmsJournalTraces`, `VoiceIpcTraces` with one driver each (or one generic driver), so a change to one class reruns only its model. | low |
| 3 | — | T4 / owner | `DeviceActions` native projection of `SmsSendJournal` duplicates what `NativeSmsDispatch` executes end to end. | Formal owner decides whether `DeviceActions-native` can be retired in favour of `NativeSmsDispatch`; if yes, delete `smsTraces()`. | low |
| 4 | — | manifest | `VoiceIpcAssembly` manifest `sources` list `NativeVoiceBinding.java`, `VoiceEventAdmission.java`, but the harness runs `BufferedStreamExchange` (upstream). `DeviceActions` sources list TS and `AlphaTelephonyPlugin`, not `SmsSendJournal`. Change detection (`quint:changed`) therefore misses the code actually refined. | Add the executed upstream files to the manifest entries (or the driver's `sources`). | medium |
| 5 | — | P1 | Upstream-only inputs; runs every PR. | Gate on `upstream.lock.json`/patches. | — |

## Proposed end state
Three small harnesses (or three static methods behind a generic driver), each observing state from the executed class after every step, manifests naming the executed sources, run only when the upstream pin, patches or the model change.
