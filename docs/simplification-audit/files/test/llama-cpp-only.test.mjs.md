# test/llama-cpp-only.test.mjs
- Lines: 82 | Kind: mixed. Tests 1-3: repository text/path scans (`git ls-files`, `package-lock.json`, contents of web-owned files); tests 4-5: tooling tests of `auditWebBundle`/`engineFindings` (`scripts/audit-production-bundle.ts`) on temp bundles; test 6: regex constants `REMOVED_SPEECH_ENTRY`/`REMOVED_SPEECH_CLASSES` from `scripts/apk.ts` | Verdict: SIMPLIFY and MERGE tests 4-6 into `test/tooling/apk-verify-audit.test.ts`; DELETE tests 1-3
- Covers: owner rule "on-device inference only via the llama.cpp-based libelizainference stack": no ONNX/sherpa/k2 runtime in the web bundle, APK or dependency tree. Duplicates: `test/licenses.test.mjs:219-224` (removed runtimes absent from notices); the production bundle audit (`npm run audit:bundle` in `verify`) and `scripts/verify-apks.ts` enforce the rule on build output. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-24, 34-42 | T1 | Scans every tracked path and the contents of "web-owned" files for a banned word (assembled from pieces so the test does not match itself); forces other files (e.g. `licenses.test.mjs:220`) to spell names in pieces. | Delete; the bundle and APK audits check what ships. | Low |
| 2 | 26-32 | T1 | `package-lock.json`/`package.json` scan and a "no `browser-speech` npm script" check. | Delete; a banned package in the lock that is not bundled does not ship. If the owner wants a dependency gate, add it to the bundle audit's input check. | Low |
| 3 | 53-74 | — | Real audit function over temp bundles, both flag modes, plus a base64 false-positive guard. Release-gating tooling. | Keep (merge). | Low |
| 4 | 76-82 | T3 | Regex constant table; acceptable as the APK audit's rule table, but better asserted through `distributionProblems` on a fake APK entry list. | Merge as one APK-audit case. | Low |
| 5 | 18 | C6 | `HISTORICAL` doc path list exists only for test 1. | Gone. | Low |

## Proposed end state
File deleted. `test/tooling/apk-verify-audit.test.ts` holds "bundle audit refuses engine files and references (both
flag modes)", "no false positive on base64 payloads", and "APK audit names removed speech entries and spares
libelizainference". No repository-wide text scan.
