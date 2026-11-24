# specs/quint/native/NativeHostedInbox.qnt
- Lines: 261 | Kind: Quint model (live, `native` manifest; JVM refinement harness) | Verdict: KEEP (disagree with the D5 delete listing); shrink the harness compile list with Q-HOST-1
- Covers: `HostedDelivery.sync` + `HostedInbox` for the **resident** result channel: two pages per poll, durable rows before ack, exact-commit ack, notice retry without reposts, 100-row packed cache eviction, one run owner per generation. Duplicates: none. Callers/importers: `native/manifest.json` (8 tests, 3 invariants), harness `refinement/native/hosted-inbox.mjs` + `HostedInboxTraces.java` (517 lines); `test/quint-native-hosted-inbox.test.mjs`; native aggregate; README `:551`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3 | - (correction) | `cross-file-actions.md` U-R5 lists "Quint: `NativeHostedInbox.qnt`, `hosted-inbox.mjs`, `HostedInboxTraces.java`" under the D5 hosted/paired deletion. The model and harness are resident-only: the harness stub throws unless `resident` (`hosted-inbox.mjs`, `HostedDeliveryWorker.schedule` "Resident fixture only"), and `HostedInbox.java` is the on-device result inbox that stays. | Do **not** delete. Remove the U-R5 line. | H if deleted: resident result delivery loses its only behavioural model |
| 2 | harness | A3 (follow-up) | The harness compiles `HostedTransport.java`, `NativeDeviceEnrollmentKey.java`, `CloudDeployment.java` because `HostedDelivery` references them for cloud/remote modes; its obligation text mentions "Remote, Cloud". | When Q-HOST-1 removes the cloud/remote modes, drop those three from `compiled` and reword the obligation. | M |
| 3 | harness | - | No text slices of product files; real classes compile, async poll threads are driven through synthetic ports. | None. | - |
| 4 | test wrapper | T4, B5 | Run twice; pins `traces 12`, `observedFields 20`. | One runner; `> 0`. | L |

## Proposed end state
Model unchanged. Harness compile list follows the resident-only `HostedDelivery`. The delete line in
`cross-file-actions.md` is withdrawn.
