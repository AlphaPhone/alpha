# test/quint-mms-compose.test.mjs
- Lines: 6 | Kind: Quint replay wrapper (calls `runMmsComposeCase1/2/3` from `specs/quint/refinement/services/mms-compose-replay.mjs`) | Verdict: DELETE
- Covers: the MMS composer follows MmsCompose (scenarios, witnesses, 80 walks); accepted/hidden uncertain MMS cannot dispatch again; a declined review is re-reviewed under a new operation ID. Duplicates: `specs/quint/refinement/services/forward-replays.mjs` registers `MmsCompose` and runs the same replay inside `test/quint-services-refinement.test.mjs`; `runMmsComposeReplay` runs Case1 without canaries. Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-6 | T4, P3 | Same replay executed twice per `npm test` (240 s). | Delete the wrapper. | None |
| 2 | 5-6 | — | Case2/Case3 are concrete regressions the aggregate does not run. | Call them from `runMmsComposeReplay`. | Low |
| 3 | 4 | T5 | Case1 here also runs the projection canary. | Drop the canary. | None |

## Proposed end state
Deleted. `MmsCompose` runs once through the services forward-replay list in the manifest runner.
