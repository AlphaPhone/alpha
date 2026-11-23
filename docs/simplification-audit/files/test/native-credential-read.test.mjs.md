# test/native-credential-read.test.mjs
- Lines: 77 | Kind: transplant (slices `withCredentialRead` bodies from Alpha `AlphaCloudSignInPlugin.java` and `AlphaLocalAgentPlugin.java`, regex-extracts the abstract signature from `vendor/eliza/.../CloudSignInPlugin.java`, compiles into a harness on host JVM) | Verdict: DELETE
- Covers: the shared sign-in credential read hook runs under the lifecycle lock then the vault lock and is refused during a credential mutation. Duplicates: none found in specs or other tests. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-23 | T2 / T1 | Exact-string regex on an upstream signature plus brace-counted method slices from two Alpha classes. | Delete. | Medium |
| 2 | 41-71 | - | Lock order and mutation refusal are real concurrency properties with no other coverage. | Coverage at risk: add as an instrumentation case in the existing credential/storage durability instrumented suite, or a native Quint refinement compiling the real classes, if the owner wants it kept. | Medium |

## Proposed end state
File deleted; lock-order coverage moves to instrumentation or a native refinement only if requested (owner question).
