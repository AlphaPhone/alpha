# test/power-cold-native-pin.test.mjs
- Lines: 178 | Kind: Java transplant (slices two regions of `AlphaLocalAgentPlugin.java` by text markers into a stub class) + host-JVM integration of the real `AlphaCredentialStore.java` and `LocalAgentProviderAdmission.java` + an Android-36 compile check | Verdict: REWRITE as a Gradle JVM test (interim: keep test 2 only, drop the slice)
- Covers: the Power-button launch pin (AP-06 / P-61, kept by D7) is invalidated by every account, generation, permission, shutdown or provider change, and credential-store commits advance the authority epoch exactly on authority mutations. Duplicates: `specs/quint/refinement/native/assistant-entry.mjs` replays the entry side, not the pin epoch. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14 | T2/T10 | `policy()` and `mutation()` slice `AlphaLocalAgentPlugin.java` between `' private static long powerAuthorizationMutationEpoch;'` / `' private final java.util.Set<String> cancelledStarts'` and `' interface CredentialMutation<T>'` / `' static boolean providerAdmissionReadable()'` (all four markers present today). Any reorder of the 1,369-line plugin breaks it. | Extract the pin/epoch policy into its own class (`PowerLaunchPolicy.java`) so a JVM test compiles it whole; delete the slicing. | Medium (D1 plugin split will move these anyway) |
| 2 | 30-69 | T2 | Test 1 runs the sliced policy inside a hand-written stub `AlphaLocalAgentPlugin` with 7 stubbed Android/org.json classes. | Rewrite against the extracted class. | Medium |
| 3 | 71-162 | keep | Test 2 compiles the real credential store and admission with modelled slots and checks 30+ epoch transitions (CAS, A-B-A, rollback, failed write fails closed). Real value. | Keep the scenario; move to the Gradle JVM test source set with the shared Android stub set (P6). | Low |
| 4 | 132 | A1 | Comment refers to "the legacy-recovery block" before the provider write; legacy Cloud recovery is deleted in A5. | Update comment when moving. | Low |
| 5 | 164-178 | B5 | Android-36 compile of sliced sources. Gradle already compiles the real files against API 36. | Delete. | Low |
| 6 | 16-28 | C3 | SDK discovery, `workspace()` and `javac()` helpers duplicated verbatim in `power-sense-entry.test.mjs:12-23`. | Shared JVM helper (`test/fixtures/jvm-tools.mjs`) or Gradle. | Low |

## Proposed end state
A Gradle JVM test `PowerLaunchPinTest` compiling the extracted pin policy class plus the real `AlphaCredentialStore`
and `LocalAgentProviderAdmission`, with one shared set of Android stubs. Cases: exact account+generation pin,
A-B-A never resurrects, mutation/shutdown/stopping/permission/missing or non-Cloud admission all fail closed, and the
epoch table from test 2. No text slicing, no API-36 recompile. Until the Gradle lane exists, keep test 2 here and delete 1 and 3.
