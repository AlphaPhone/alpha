# specs/quint/refinement/native/ListenerInputTraces.java
- Lines: 138 | Kind: Quint refinement harness (whole vendored listener capture loop: `ListeningService`, `Listener`, `ListenerStore`, `ListeningEpoch`, `IndicatorLease`, `ListenerPolicy`, `CrashLoopBreaker`, `SpeechGate`, `WakePhrase`, `SenseConfig`; synthetic PCM/audio callbacks) | Verdict: KEEP (gate on upstream changes)
- Covers: always-on listener input: wake phrase invoke/pause, short utterance, partial reads, busy ASR, lock screen, phone-call modes holding ASR or queued actions, other-app/mixed recording, mic privacy, playback guard window (11.5 s), system sounds, indicator hidden, lease revoked, destroy with pending ASR/queued action. Duplicates: none (host `test/voice-*.test.mjs` cover renderer voice, not this service). Callers/importers: `listener-input.mjs` (`javaTraceCampaign`, one JVM per scenario), native aggregate, `test/quint-listener-input.test.mjs`.
- Model live: `NativeListenerInput` (vendored sense sources only). Feature kept by D7 (always-on listening is PRD-planned).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32-35, 73-74 | T8 | `await()` polls with `Thread.sleep(1)` up to 6 s per boundary; conditions are real source boundaries, not fixed sleeps. | Keep. | low |
| 2 | 38-41, 53 | T10 | Reads private service fields (`recognizing`, `recognizer`, `playbackQuietSince`, `leaseStopPosted`, `capture`, `analyse`, `record`, `reapply`, `destroyed`) and captured lambda fields of queued `WakePhrase` actions by type. Upstream rename breaks it, only on a pin bump. | Keep; gate on upstream changes. | low |
| 3 | 45, 41 | C3 | `captured(task,type)` duplicates `LiveCaptureTraces.captured` and the probes' generation readers. | One `Trace.captured(Object,Class)` helper. | low |
| 4 | — | — | Uses `javaTraceCampaign` from the driver (the pattern the sibling harnesses should copy). | Keep. | — |

## Proposed end state
Unchanged scenarios; shared reflection helpers from `Trace.java`. Path filter: `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, `android/sense/**`, model, this directory.
