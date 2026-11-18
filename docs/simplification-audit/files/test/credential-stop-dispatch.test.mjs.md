# test/credential-stop-dispatch.test.mjs
- Lines: 94 | Kind: host-JVM transplant: slices `mutateCredentials`, `commitCredentials`, `requireLockOrder`, `shutdownRetryRequired` from `AlphaLocalAgentPlugin.java` into `MutationHarness` with a stub `ElizaAgentService`, stub `android.os.SystemClock`, stub `JsonCredentialSlots`, and the real upstream `CredentialShutdownLease.java` | Verdict: REWRITE as Gradle JVM test (merge with the other two credential tests)
- Covers: a credential mutation reserves an agent shutdown, keeps it across a dispatch failure, releases only on exact ack, cancels before commit, keeps the fence on an uncertain commit until Retry, and cannot release a successor. Duplicates: upstream tests of `CredentialShutdownLease` exist in `vendor/eliza` (the lease part); the Alpha-side sequencing is not covered elsewhere. Callers/importers: `npm test` glob; `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-21 | T2 / T10 | Four methods sliced by signature + brace counting; their free variables are recreated as static fields in the harness. | Extract the mutation sequencing into a plain class with an injected service port; JUnit over it. | Medium |
| 2 | 86-88 | T5 | Last case tests only the upstream `CredentialShutdownLease` (old owner cannot release successor). | Delete; upstream owns it. | Low |
| 3 | 63-85 | — | Throw-after-reserve, uncertain commit → Retry, later completed commit clears it: the valuable cases. | Carry. | Medium |

## Proposed end state
Merged into `CredentialFencesTest` (Gradle JVM) over the extracted class; the upstream lease case is dropped.
