# specs/quint/native/ListenerLeaseProducer.qnt
- Lines: 176 | Kind: Quint model (live; models upstream SystemUI chip code in the AOSP image) | Verdict: KEEP for now; fix manifest `sources`; MOVE upstream (D14 follow-up)
- Covers: the SystemUI producer of listener-health acknowledgements: measured status/keyguard/shade surface and chip, chip only claimed while recording, acknowledgements delivered serially from snapshots, target provider package/UID validated, refused/errored/revoked generations retired, user switch and Binder death revoke. Duplicates: consumer side is `ListenerLeaseRecovery` / `NativeIndicatorProvider` (different side of the lease). Callers/importers: `quint:check` (10 runs, manifest `bounds`); `refinement/native/ProducerTraces.java` (package `com.android.systemui.privacy`), compiled in `refinement/native/index.mjs:86-91` with `vendor/eliza/packages/app/test/android/sense-fixtures/systemui-chip-jvm/**` stubs and `vendor/eliza/packages/os/android/sense/systemui/chip/source/SenseListening{Policy,Lease}.java`; obligation `index.mjs:242`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `sources: []` | T10 / P1 | The entry lists no sources, so `scripts/check-changed-models.ts` never selects it and receipts do not bind the code it checks. The real inputs are the two upstream SystemUI files above. | Set `sources` to `vendor/eliza/packages/os/android/sense/systemui/chip/source/SenseListeningPolicy.java` and `SenseListeningLease.java` (+ `upstream.lock.json`). | Low |
| 2 | — | §2.9 / P6 | All modelled code is upstream (AOSP image SystemUI). Always-on listening is a planned AOSP gate (D7), so the behaviour is live, but the code is not this repo's. | Gate on `upstream.lock.json`; list as upstream follow-up (model + `ProducerTraces.java` belong with the SystemUI chip sources). | Low |
| 3 | 66-96 | D8 | 15 environment actions each rebuild `view` and set `scheduled: s.running`. Readable; a `see(v)` helper would shorten them. | Optional. | None |
| 4 | 146-147 | — | `SerializedDelivery`/`TypeOK` are bounds rather than properties. | Fine. | — |

## Proposed end state
Model unchanged; manifest `sources` names the two upstream files so changed-model selection and receipts bind them.
CI runs it on upstream pin changes only. Upstream follow-up: move model and Java driver next to the SystemUI chip
sources.
