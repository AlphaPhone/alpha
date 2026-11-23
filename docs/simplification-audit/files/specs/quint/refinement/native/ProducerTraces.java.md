# specs/quint/refinement/native/ProducerTraces.java
- Lines: 54 | Kind: Quint refinement harness (upstream SystemUI `SenseListeningLease` with upstream JVM stubs) | Verdict: KEEP (upstream-only model lane)
- Covers: live model `specs/quint/native/ListenerLeaseProducer.qnt`: serial lease delivery from the SystemUI privacy chip producer: accepted, refused, no provider, delayed recording, failed acquire; no non-serial delivery. 5 modes. Duplicates: none here.
- Callers/importers: `refinement/native/index.mjs:85-91` `extraGroups` (main class `com.android.systemui.privacy.ProducerTraces`; compiles `vendor/eliza/packages/app/test/android/sense-fixtures/systemui-chip-jvm/**` and `vendor/eliza/packages/os/android/sense/systemui/chip/source/{SenseListeningPolicy,SenseListeningLease}.java`). Aggregate only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / §2.9 | AOSP/SystemUI upstream code; no product file. The manifest entry has `"sources": []`, so no change-detection ties the model to the Java it replays. | Add the two upstream source paths to the manifest entry (or let the upstream lane trigger on `upstream.lock.json`); long term move upstream. | Low |
| 2 | 1 | D11 | Lives in `refinement/native` but is in package `com.android.systemui.privacy`. Required to reach package-private members. | None. | None |

## Proposed end state
Unchanged; upstream-change lane only; manifest lists its real sources.
