# test/startup-access-flow.test.mjs
- Lines: 51 | Kind: integration-lite (imports real `apps/app/src/startup-permission-flow.ts`, fake bridge and store) | Verdict: MERGE into `test/startup-permission-completion.test.mjs`
- Covers: Startup permission flow: checks never prompt, denial goes to Settings, attempts persist (or not, when storage fails), and malformed native photo/location results are refused. Duplicates: `test/startup-permission-completion.test.mjs` renders the same flow through `StartupPermissions`; `test/browser/startup-permissions-walkthrough.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-10, 24-29 | - | Native result parsing at the bridge boundary (photo scope, location accuracy) with malformed inputs; not covered elsewhere. | Carry as one table case in startup-permission-completion (native fixture returns malformed scope/accuracy). | Med |
| 2 | 11-22, 32-51 | T4 | Prompt/Settings/memory sequencing duplicates completion tests ("denied native permission ... settings never repeats its prompt"). | Drop. | Low |

## Proposed end state
File deleted; malformed-native-result cases move to the completion integration test.
