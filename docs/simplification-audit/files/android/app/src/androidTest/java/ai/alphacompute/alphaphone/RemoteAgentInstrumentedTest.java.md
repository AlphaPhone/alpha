# android/app/src/androidTest/java/ai/alphacompute/alphaphone/RemoteAgentInstrumentedTest.java
- Lines: 54 | Role: pairs the phone with a local Eliza app host at `10.0.2.2:47839` via a pairing code, chats over native HTTP and checks restore after recreation. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:339` `NOT_RUN_BY_A_RUNNER.RemoteAgent` ("its runner was removed in 49b1bf4c"); removal of the entry is enforced by `test/android-instrumentation-runner.test.mjs:204`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-54 | A3 / A7 | Hosted-agent pairing ("Local development agent", pairing code) contradicts the PRD ("No hosted-agent pairing", `docs/prd.md:11,17`); gate `localRemote=true` has no runner (grep `localRemote` in scripts/.github: 0 outside the registry note). | Delete the file and its `NOT_RUN_BY_A_RUNNER` entry; part of the P15 paired/remote removal. | none |
| 2 | 41 | C6 | `'alpha.connection.selection.v1'` literal (catalogue C6 example). | Goes with the deletion. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until` / `click` / `message` | helper | 17-31 | `message` = composer+Send idiom also in `LiveAgent`, `CombinedAgent*` (all NOT_RUN) | deleted |

## Proposed end state
File removed. 0 lines.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`.
