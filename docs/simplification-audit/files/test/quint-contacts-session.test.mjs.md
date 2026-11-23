# test/quint-contacts-session.test.mjs
- Lines: 4 | Kind: Quint replay wrapper (calls `runContactsSessionCase1` from `specs/quint/refinement/services/contacts-session-replay.mjs`) | Verdict: DELETE
- Covers: the read-only Contacts adapter follows ContactsSession scenarios, witnesses and random walks. Duplicates: `specs/quint/refinement/services/forward-replays.mjs` registers `ContactsSession` and runs the same replay inside `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T4, P3 | Same replay executed twice per `npm test` (240 s budget). | Delete the wrapper. | None |

## Proposed end state
Deleted. `ContactsSession` runs once through the services forward-replay list in the manifest runner.
