# android/app/src/main/java/ai/alphacompute/alphaphone/HostedDelivery.java
- Lines: 73 | Role: Application-scoped owner of hosted/resident result delivery: active binding, generation fence, transport selection, inbox sync and polling. | Verdict: SIMPLIFY (owner decision on modes)
- Importers: `AlphaHostedResultsPlugin`, `HostedDeliveryWorker`, `NativeDigestHost`; androidTest HostedBackgroundWorker/HostedProcessRestart/HostedResultNotice. Text/path pins: `specs/quint/native/{NativeHostedInbox.qnt,README.md,manifest.json}`; `specs/quint/refinement/native/{HostedInboxTraces.java,HostedResultNoticeTraces.java,hosted-inbox,hosted-result-notices,native-digest-platform,native-digest,source-renewal-platform}.mjs`; `test/resident-result-transport.test.mjs` + `test/fixtures/ResidentDeliveryTest.java`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-51, 17 | A3/P15 | `configure` accepts modes `cloud`, `remote`, `local`, `resident`; `cloud` (Cloud-hosted dedicated agent) and `remote`/`local` (paired agent) contradict PRD "no hosted-agent pairing"/"Cloud never hosts Alpha's agent"; renderer writes the Cloud-runtime connection only under test mocks. | Owner decision: keep only `resident`; delete `HostedTransport`, the `cloud`/`remote` branches, `NativeDeviceEnrollmentKey.cloud`, and the `mode` field becomes constant. If kept as a dev surface, refuse non-resident modes unless `ELIZA_DEV_ALLOW_TEST_MOCKS`. | high (persisted `hosted-background:v1:active` records with other modes become invalid) |
| 2 | 15 | C4/D8 | One 900-char line: anonymous `HostedInbox.Store` wrapping each slot call in `HostedStorageFault`, plus a second anonymous `HostedResultNotices.Storage` forwarding to the first. | Named private class `FaultingStore implements HostedInbox.Store`; make `HostedResultNotices` take `HostedInbox.Store` (same read/write shape) so the second adapter disappears. | low |
| 3 | 45, 57 | C3 | Inline regexes `[a-f0-9-]{36}`, `[a-f0-9]{64}`. | Shared `Ids`. | none |
| 4 | 62-64 | D4 | `sync(generation)` / `syncBackground(generation)` / `checkRun` wrappers over private `sync(gen,bool)`; both are live (`AlphaHostedResultsPlugin.syncInbox:49`, `HostedDeliveryWorker:20`). | Keep both entry points; inline `checkRun` as a ternary. Low value. | none |
| 5 | 66 | B1 | `stop`: `catch(Exception ignored){if(transport!=null)transport.close();}` | Read failure still closes; fine but write as `finally`-style: close whenever the generation cannot be confirmed. | none |
| 6 | 9, 68-69 | C6 | Slot literals `hosted-background:v1:active`, `hosted-background:v1:preference`, `hosted-digests:v1:` (also in HostedInbox:26, HostedResultNotices:38), `resident-results:v1:credential` (42, 54). | Constants in one place (HostedInbox or a `HostedSlots` holder). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| NativeSourceWork | interface | 30 | AlphaGmailPlugin.Work, AlphaDeletionsPlugin.Task (background lambdas) | stay |
| ACTIVE | const | 9 | - | stay |
| store adapter | anon class | 15 | 12 slot adapters | FaultingStore |

## Proposed end state
If resident-only: ~50 lines (binding validation shrinks to the resident path, transport always `ResidentResultSession`). Otherwise ~65 lines after formatting-neutral cleanups. Estimated lines after: 50.

## Verification
androidTest Hosted*; Quint NativeHostedInbox + hosted-inbox refinement; `test/resident-result-transport.test.mjs`.
