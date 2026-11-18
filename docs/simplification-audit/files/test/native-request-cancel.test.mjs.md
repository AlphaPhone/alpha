# test/native-request-cancel.test.mjs
- Lines: 124 | Kind: renderer half = integration of the real `apps/app/src/runtime/local-agent.ts` bundled by esbuild with `@capacitor/core` and `../platform-plugins` replaced by a stub; native half = transplant (five marker slices of `AlphaLocalAgentPlugin.java` pasted into a generated Java class) | Verdict: MERGE tests 1-2 into `test/integration/resident-runtime.test.ts`; DELETE tests 3-4
- Covers: aborting a plain native request sends `cancelRequest` with the id sent with it, completed requests send none and ids are unique; natively a withdrawn queued or enrolling request is never dispatched. Duplicates: `test/quint-native-request-withdrawal.test.mjs` with `specs/quint/refinement/native/RequestWithdrawalReplay.java` ("real renderer withdrawal and three native requests refine the two-worker model"). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-14 | C5 | Same esbuild + Capacitor-stub loader as `native-start-cancel.test.mjs`, built twice. | One shared loader in the resident-runtime integration file. | None |
| 2 | 44-51 | B2 | "native build without cancelRequest" guards a method that ships in the same APK. | Delete with the product `?.` guard. | None |
| 3 | 53-124 | T2, T4 | Native half slices `AlphaLocalAgentPlugin` by five literal markers; the Quint replay already covers withdrawal. | Delete; port the request worker to an extracted class in the plugin split (see chunk cross-file action). | Low |

## Proposed end state
Two renderer cases in `test/integration/resident-runtime.test.ts` sharing one bundled `LocalAgentProtocol` with
`native-start-cancel` cases. Native withdrawal stays covered by the Quint refinement.
