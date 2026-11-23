# specs/quint/services/NativeCredentialMutation.qnt
- Lines: 247 | Kind: Quint model (services family, live; 23 tests, 3 witnesses, 5 symbol pins) | Verdict: KEEP; SIMPLIFY (dead state, move to native family, one harness)
- Covers: `AlphaCredentialStore.mutateSlotOnce` / `AlphaLocalAgentPlugin.mutateCredentials`: classify a credential mutation, stop the resident with an exact acknowledgement before a critical write, re-check owner epoch / credential / provider revision before commit, invalidate provider admission, Cloud-change observer ordering, capacity refusal, shutdown-lease and provider-request fencing. Sources all exist (`AlphaCredentialStore`, `AlphaLocalAgentPlugin`, `LocalAgentProviderAdmission`, `ResidentCredentialShutdownRetry`, `AlphaConnectionPlugin`, `SerialStorageTasks`, `GmailBackground`). Duplicates: refined by three harnesses: `refinement/services/credentials.mjs` (+ `ServiceCredentialTraces.java`), `refinement/native/credential-coordinator.mjs` (`CredentialCoordinatorTraces.java`) and `refinement/native/credential-leases.mjs`; `test/quint-native-refinement.test.mjs` lists it among native models. Callers/importers: manifest; services aggregate; native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 22, 112, 161 | A1 / A7 | `legacyBlocked` and `blockLegacy` are written and never read by any guard, invariant, witness or test (grep of `specs/quint` finds only these four lines). Dead state that inflates the state space. | Delete the field and the action. | None |
| 2 | 88-92, 193-194 | A1 (check) | `capacityFailure` comment and `retainedShrinkTest` model an already-stored over-cap ("retained legacy") value that may shrink. `AlphaCredentialStore.requireCapacity` refuses every over-cap write before it happens, so on a fresh package such a value can only come from older data. | If the Android legacy-reader deletion (A5/D1) removes tolerance for over-cap stored slots, drop the `oldSize > cap` branch and the test; otherwise keep and reword "legacy". | Low |
| 3 | whole | structure | An Android-native model filed in the services family and refined by three separate harnesses across two families (T4/C5). | Move to `specs/quint/native/` and keep one campaign file that composes the three trace sets. | Medium: manifest + floors in `test/quint-checker.test.mjs` |
| 4 | 113-157 | D10 | Shutdown-lease and provider-request fencing (`ResidentCredentialShutdownRetry`) are an independent sub-machine sharing no guard with the mutation phases except `ownerEpoch`. | Optional split into its own module in the same file group; only if the harness split makes it simpler. | Low |
| 5 | manifest symbols | T10 | 5 symbol pins by name. | Pin files, not names. | Low |

## Proposed end state
~235 lines without `legacyBlocked` (and without the retained-over-cap branch if D1 removes it), registered in the native family, refined by one Java campaign that the native runner executes once.
