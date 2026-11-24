# test/google-agent-access.test.mjs
- Lines: 92 | Kind: mixed: integration (tests 1-2: real shared host via `support/managed-google-agent.mjs`) + unit with stubbed `require` (tests 3-5: `google-agent-access.ts` compiled to CJS and run in a vm with fake modules) | Verdict: MERGE tests 1-2 into `test/integration/inbox-gmail-google.test.mjs`; REWRITE tests 3-5 as cases in `journeys/settings.spec.ts`
- Covers: the owner's "Gmail changes" and "Calendar edits" switches refuse agent writes before any Cloud request while reads continue; the renderer never publishes the default over a saved "off" before settings load; on the phone a failed native save fails the toggle and rolls back before a later choice. Duplicates: `test/native-google-agent-host-access.test.mjs` (phone entry), `GoogleAccessPublication.qnt` (publication ordering model), `google-connections-resource-budget.test.mjs` (switch UI). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T9 | Self-respawn under tsx with `--conditions=eliza-source`. | The integration runner sets the loader once. | none |
| 2 | 14-30 | — | Real host, fake transport: good integration cases. | Carry both into the inbox-gmail-google file. | none |
| 3 | 31-40 | T3 | `transformSync` of the whole module and a `require` that serves fake `device-preferences`, `@capacitor/core`, `local-agent`. Not a slice, but every collaborator is fake. | Delete the harness; carry the three behaviours (no publish before load, failed save reverts the switch, ordered rollback) to the settings journey. The ordering is also modelled by `GoogleAccessPublication.qnt`. | low |
| 4 | 66-67 | D8 | Blank-line noise. | Gone. | none |

## Proposed end state
Two host cases in the inbox-gmail-google integration; three renderer behaviours as settings-journey steps (toggle,
reload, observe; fail the native save through the dev bridge).
