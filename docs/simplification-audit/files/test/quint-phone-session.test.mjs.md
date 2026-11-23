# test/quint-phone-session.test.mjs
- Lines: 4 | Kind: Quint replay wrapper (calls `runPhoneSessionCase1` from `specs/quint/refinement/services/phone-session-replay.mjs`) | Verdict: DELETE
- Covers: the Phone adapter follows PhoneSession scenarios, witnesses and random walks. Duplicates: `specs/quint/refinement/services/forward-replays.mjs` registers `PhoneSession` and runs the same replay inside `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T4, P3 | Same replay executed twice per `npm test` (240 s). | Delete the wrapper. | None |

## Proposed end state
Deleted. `PhoneSession` runs once through the services forward-replay list in the manifest runner.
