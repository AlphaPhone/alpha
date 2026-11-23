# test/fixtures/GmailBackgroundLockContentionTest.java
- Lines: 80 | Kind: Java fixture, multi-thread integration (real `AlphaCredentialStore`, `GmailBackground`, `AlphaLocalAgentPlugin.withCredentialSlotMutation`, upstream `JsonCredentialSlots` and `MailBackgroundDelivery`, secure-store memory stubs) | Verdict: KEEP, MOVE to the Gradle JVM inbox/credentials suite
- Covers: Gmail background withdrawal and a lifecycle-owned vault write take the lifecycle monitor before the vault monitor, so they cannot deadlock; the Gmail slot is removed, an unrelated slot write survives, notices and the schedule are cancelled once. Duplicates: none (a deadlock is not reachable from Playwright). Callers/importers: `test/gmail-background-lock-contention.test.mjs:33`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41 | D3 | Reaches `AlphaLocalAgentPlugin.lifecycleLock` (a static field used as a process-wide lock) and `JsonCredentialSlots.LOCK`. | When D3 moves the lock to a plain service class, update the reference; the test is the proof that the order holds. | Medium |
| 2 | 32-36, 57-72 | test design | Uses `ThreadMXBean` to wait on the exact owner and monitor instead of sleeping: a good pattern (no fixed sleeps). | Keep. | Low |
| 3 | 77 | coupling | Reads static counters `MailNoticePoster.cancellations` / `GmailDeliveryWorker.cancellations` from stubs. | Keep in the stub set; document them in the shared Android stubs. | Low |

## Proposed end state
A Gradle JVM test in the credentials/inbox suite, same body, using the shared Android stub set instead of the
per-family `secure-store-memory` tree. Node wrapper deleted.
