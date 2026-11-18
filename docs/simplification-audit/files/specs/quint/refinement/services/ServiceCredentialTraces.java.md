# specs/quint/refinement/services/ServiceCredentialTraces.java
- Lines: 33 | Kind: formal harness JVM driver (real `AlphaCredentialStore` over an in-memory `JsonCredentialSlots` and a stub `AlphaLocalAgentPlugin` from `credential-platform.mjs`) | Verdict: KEEP
- Covers: model `NativeCredentialMutation`: a credential slot write strips provider admission, a concurrent provider change makes compare-exchange refuse, and the byte-cap preflight rejects before the lifecycle callback. Duplicates: none found (Android instrumentation for the store does not race provider admission). Importers: `credentials.mjs` only. The worktree already updates it for `retainedLimit` -> `slotLimit` and `credentials.mjs` dropped `LegacyCloudRecovery.java` (stage A5).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-31 | D8 | Statement soup: up to ~400-character lines with several statements each; hard to see which trace step maps to which model action. | Reformat (one statement per line) when the Java formatter pass reaches specs, or by hand when next touched. | None |
| 2 | 15, 26 | C6 | Literal `"cloud:production"` repeated 8 times (also 32x in product Java, android C6). | Use `CloudDeployment` constant once it exists. | Low |
| 3 | 9 | — | `AlphaLocalAgentPlugin.requested` / `beforeCommit` are fields of the **stub** in `credential-platform.mjs:39-40`, not product hooks (no D7 issue). | None. | — |

## Proposed end state
Same 3 traces, reformatted to one statement per line (~60 lines). Keeps calling the real package-private `AlphaCredentialStore` API.
