# specs/quint/refinement/native/DeletionTestPorts.java
- Lines: 125 | Kind: Quint harness support (Java static port surface) | Verdict: KEEP
- Covers: no behaviour; controlled durable values with numbered write faults (`failBefore`/`failAfter`/`failDispatchId`), scheduler refusal, provider delete outcome, owner-route HTTP replies (`/api/auth/me`, `/api/agents`, `/api/client-devices/context`), and reminder stage/settle/pause replies, all logged to `portEvents`. Duplicates: same "static port + fault flags + event log" shape as `CredentialCoordinatorPorts.java` and `ResidentTestPorts.java` (C5).
- Callers/importers: `DeletionCoordinatorTraces.java`; compiled by `deletion-coordinator.mjs`; the generated stubs in `deletion-platform.mjs` call into it (storage, WorkManager, owner routes, reminder host). No other users (grep: `deletion-coordinator.mjs`, `deletion-platform.mjs`, `DeletionCoordinatorTraces.java`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 100-124 | C3 | `stageReminder`, `settleReminder`, `pauseReminder` repeat count/log/require-reply/copy. | One private `reply(kind, fields)` helper. | None |
| 2 | 52-68 | — | `initializeAgent` seeds a device-enrollment slot via the real `NativeDeviceEnrollmentKey.local` (good: no hard-coded slot name). | None | None |
| 3 | whole | C5 | Shared harness-port shape. | Consolidate only if a common `Ports` base appears; not worth a dedicated change. | None |

## Proposed end state
Kept as the deletion campaign's port surface, with the three reminder reply methods folded into one helper.
