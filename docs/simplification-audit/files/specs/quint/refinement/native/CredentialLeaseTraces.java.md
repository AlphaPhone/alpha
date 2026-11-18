# specs/quint/refinement/native/CredentialLeaseTraces.java
- Lines: 69 | Kind: Quint refinement harness (Java, upstream-only classes, direct calls) | Verdict: KEEP, MOVE to upstream-lock lane (upstream follow-up: move upstream, D14)
- Covers: `NativeCredentialMutation` (id `NativeCredentialMutation-current-leases`): upstream `CredentialShutdownLease` acquire/retry/acknowledge/abandon/release and `CredentialRequestFence`/`CredentialIntentFence` reserve/begin/cancel/expire/stale-owner, 13 traces. Duplicates: `CredentialCoordinatorTraces` exercises the same leases indirectly through the product plugins (more valuable); upstream has its own tests for these classes (not checked here).
- Callers/importers: `credential-leases.mjs` (`checkCredentialLeasePolicies`); run by `test/quint-credential-leases.test.mjs` and `index.mjs:190` (aggregate). Sources compiled: only `vendor/eliza/plugins/plugin-native-agent/.../runtime/{CredentialRequestFence,CredentialShutdownLease,CredentialIntentFence}.java` and one secure-store file.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / §2.9 | Models upstream code only; result changes only on a lock bump. | Run only when `upstream.lock.json`, `patches/eliza/**` or `NativeCredentialMutation.qnt` changes. Upstream follow-up: move with the classes. | None |
| 2 | 13-25 | T10 | Reflection on upstream private fields (`sequence`, `pending`, `confirmed`, `abandoned`, `requests`, `begun`, `intent`). | Upstream follow-up: expose a read-only snapshot. | Low |
| 3 | campaign | T4 | Runs in both `test/quint-credential-leases.test.mjs` and the aggregate. | One runner. | None |

## Proposed end state
Unchanged file, scheduled only on upstream/model changes and run once; listed as an upstream follow-up.
