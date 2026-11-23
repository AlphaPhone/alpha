# android/app/src/main/java/ai/alphacompute/alphaphone/GmailDeliveryWorker.java
- Lines: 13 | Role: WorkManager worker and scheduler for the background Gmail check (periodic + catch-up). | Verdict: SIMPLIFY
- Importers: `GmailBackground` scheduler. Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{GmailBackgroundTraces.java,gmail-background*.mjs}`; `test/fixtures/GmailBackgroundLockContentionTest.java`, `test/gmail-background-lock-contention.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | C3/D8 | Whole periodic + catch-up scheduling on one 700-char line; same code as `HostedDeliveryWorker.schedule` (11) except catch-up policy (KEEP vs REPLACE), catch-up backoff and network constraint. | Shared `Workers.schedulePair(context, periodicName, catchupName, workerClass, data, networkType, catchupPolicy)`; both callers pass their differences explicitly. | low |
| 2 | 11 | C3 | `cancel` (two unique names) twin of `HostedDeliveryWorker.cancel`. | Same helper. | none |
| 3 | 12 | B1 | `catch(SecurityException stale){success} catch(Exception){retry}` - documented policy. | Keep. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| schedule/cancel | helpers | 10-11 | HostedDeliveryWorker:11,16 | Workers util |

## Proposed end state
Worker class stays (WorkManager persists its name); scheduling via helper; ~10 lines. Estimated lines after: 10.

## Verification
`test/gmail-background-lock-contention.test.mjs`; device background-mail check is integration-only.
