# specs/quint/refinement/application/native-view-subscription.mjs
- Lines: 115 | Kind: Quint refinement harness, whole-file transplant via `sourceContext` (T2/T10, mild) | Verdict: PORT (trivial)
- Covers: `subscribeNativeViewEvents` in `apps/app/src/runtime/native-view-events.ts` (live): registration/subscribe races, foreign frames, terminal frames, close before replies, throwing/rejecting cleanup. Model `NativeViewSubscription.qnt` (manifest-listed).
- Duplicates: `test/quint-native-view-subscription.test.mjs` and the aggregate `index.mjs:23` run the same 20 schedules (T4). `test/native-browser-view-binding.test.mjs` touches the same module. Callers: those two plus the CLI block at 112-115.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 73 | T10 | `sourceContext([source], ['subscribeNativeViewEvents'], {crypto:{randomUUID:()=>'subscription'}})` strips types, deletes `import` lines by regex and evals the file. It works only because the file has no runtime imports. | `const {subscribeNativeViewEvents} = await sourceModule(source)` and make the id deterministic by stubbing `globalThis.crypto.randomUUID` for the run (or pass an id factory parameter if the module grows one). | Low. |
| 2 | 70-72 | B5 | Captures the test wrapper file and `strip-types.mjs` as hashed inputs. | Drop; hash only executed sources (or drop hashing entirely, see check-traces review). | Low. |
| 3 | 112-115 | A7 | CLI entry point; no script or workflow runs this file directly. | Delete. | Low. |

## Proposed end state
Import the real module, keep all 20 schedules and the fixture as is (it is a good port-level driver), run it from one test entry.
