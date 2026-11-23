# test/embedding-native-contract.test.mjs
- Lines: 60 | Kind: tooling (real `embedding-native-contract.ts` helpers on synthetic C++/Java/CMake text; case 3 builds a temp git repo; case 4 reads the **vendor** JNI sources at the working tree) | Verdict: MERGE into `test/tooling/embedding-host.test.mjs`
- Covers: identity rewriting for exported vs registered JNI, Java/C++ registration-table agreement (signature and set), required symbols, receipt admission binds Java + full native set + product class, and the current pinned streaming callback descriptor matches. Duplicates: case 3 overlaps `embedding-host-admission.test.mjs` input-change refusals. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-22 | A1 | "legacy exported JNI" mode: if the pinned upstream now only uses registered JNI (`binding.mode==='registered'` in admission fixture), the exported branch of `nativeBinding` and this case may be dead. | Check the pin; if exported mode cannot occur, delete the branch and the case. | Low-medium; needs upstream check. |
| 2 | 23-36 | - | Registration/declaration checks guard a native crash class (JNI signature mismatch = `NoSuchMethodError` at load). Real helper, synthetic input. | Carry. | - |
| 3 | 37-52 | T4 | Receipt admission on a hand-built repo duplicates admission-file rules. | Keep only the jniBinding-change rows (unique); drop the rest. | Low. |
| 4 | 54-60 | - | Checks the real pinned sources: an upstream-pin contract. | Carry; runs on `upstream.lock.json` change. | - |

## Proposed end state
Three cases (registered binding transform, Java/C++ table agreement incl. stream callback, jniBinding changes refused)
plus the pinned-source check in `test/tooling/embedding-host.test.mjs`.
