# test/prepared-navigation-route.test.mjs
- Lines: 61 | Kind: transplant (strips types of `prepared-view-navigation.ts` into `new Function`; regex-extracts `viewNavigationRequest` bodies of `local-agent.ts` and `remote-protocol.ts`) + Java transplant (slices the `if((group!=null?...` expression out of `AlphaLocalAgentPlugin.request` and compiles it with the real `PreparedViewNavigation.java`) | Verdict: REWRITE: TS half as `test/integration/local-agent.test.ts` cases on real imports; Java half to Gradle JVM `PreparedViewNavigationTest`
- Covers: renderer and native accept only the exact "prepare-only, completed-action, gui" view-navigation request with clean paths and IDs (no traversal, encoding, CR/LF, U+2028/9, NUL), and leave interact-claim/result untouched. Duplicates: none found. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9 | T2 | Type-strips the whole helper and evals it rather than importing `isPreparedViewNavigationRequest`. | Import the export. | Low |
| 2 | 24-35 | T2 | Regex `async viewNavigationRequest\([^]*?\):Promise<unknown> \{...\n  \}` cuts method bodies out of two files and runs them with a fake `this`. `remote-protocol.ts` is hosted/remote code (D5): check it survives A4 before porting that half. | Call the real exported request function with a stub transport (integration). | Medium |
| 3 | 37-61 | T2/T10 | Slices a boolean expression from the 1,369-line Java plugin by `indexOf('  if((group!=null?')` and splices it into generated Java. | Expose the gate as a static method (`OwnerRoutes`/`PreparedViewNavigation.admit(path,method,body,owner)`), compile the real class in a Gradle JVM test with the same case table. | Medium |
| 4 | 10-22 | keep | The case table (encodings, line terminators, method, owner) is the valuable part. | Carry it verbatim into both targets (share as a JSON fixture). | Low |

## Proposed end state
One JSON case table, used by a TS integration case that calls the real renderer request path with a fake fetch, and by
a Gradle JVM test of the native gate after it is a callable method. No text slicing. File deleted.
