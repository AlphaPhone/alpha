# test/native-webview-admission.test.mjs
- Lines: 23 | Kind: tooling (camera campaign through `isolated-native-campaign.mjs`) | Verdict: MERGE into `test/tooling/native-campaigns.test.ts`
- Covers: the native campaign confirms the owned user's WebView is ready before installing APKs, and a WebView service failure prevents installation and instrumentation. Duplicates: test 1 repeats the camera pass run of `native-permission-runner.test.mjs` test 1 (same `exercise('pass','camera')`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-14 | T4 | Second identical camera pass child run. | Assert WebView-before-install on the camera pass run already made in the merged file. | None |
| 2 | 16-23 | - | Distinct failure mode. | Keep. | None |

## Proposed end state
One assertion added to the camera pass case and one `webview-service-failure` case in the campaigns file.
