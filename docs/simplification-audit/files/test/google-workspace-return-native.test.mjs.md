# test/google-workspace-return-native.test.mjs
- Lines: 93 | Kind: case 1 unit on host JVM (javac of real `GoogleWorkspaceReturn.java` + inline Java driver); case 2 source-text (manifest, `product.gradle`, `AlphaConnectionPlugin.java`, and a `git ls-files` grep of every tracked Android/renderer file) | Verdict: MERGE case 1 into `GoogleWorkspaceReturnFlowTest` (Gradle JVM test, see `google-workspace-return-flow.test.mjs.md`); DELETE case 2
- Covers: exact parsing of the `https://<appLinkHost>/alphaphone/gmail/callback#state=…&result=…` return (28 rejected URL forms), binding/TTL acceptance, App Link association verdicts; and (case 2) that the return uses the build's `ELIZAOS_APP_LINK_HOST`, not a fixed domain. Duplicates: `google-workspace-return-flow.test.mjs` exercises `accepts`/`parse` through the flow. Callers/importers: `npm test` glob; `test/fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 69 | B5 | Asserts the exact check count `PASS … 85`: every added case must edit the JS too. | Drop counts; one JUnit `@Test` per rule. | Low |
| 2 | 22-64 | T3 | Pure predicate table; the parse rejection list is the valuable part (open-redirect / state-smuggling). | Carry the rejected-URL list and the host list into the Gradle test as parameterised cases. | Medium |
| 3 | 73-85 | T1 | Regex/`includes` over `AndroidManifest.xml`, `product.gradle` and Java call text. | Delete. The manifest rule belongs in `scripts/verify-apks.ts` (read the merged manifest of the built APK: one intent filter for `/alphaphone/gmail/callback`, host = build's App Link host). | Low |
| 4 | 82-84 | T1 / P1 | Reads every tracked `android/` and `apps/app/src` file to ban `alphacompute.ai`: a repo lint inside a unit test file. | Move to `scripts/audit-production-bundle.ts` / `verify-apks.ts` as a check on built output (what ships), or drop. | Low |

## Proposed end state
File deleted. Its parse/accept/association cases live in `GoogleWorkspaceReturnFlowTest` (Gradle JVM); the manifest and
"no fixed domain" rules are checks on the built APK in `verify-apks.ts`.
