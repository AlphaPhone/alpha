# test/service-read-cache.test.mjs
- Lines: 83 | Kind: integration-lite (imports real `apps/app/src/runtime/service-read-cache.ts`, in-memory CAS store) | Verdict: MERGE into `test/quint-service-read-cache.test.mjs`
- Covers: Saved-service read cache: owner binding, 30-day lifetime, CAS retry/merge with bounded attempts, disconnect fence, 24-entry bound and 5 MB body refusal. Duplicates: `test/quint-service-read-cache.test.mjs` replays the Quint model step by step against the same real module and its store binding (`specs/quint/refinement/services/service-read-cache-replay.mjs`), including the entry bound (case 3). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-39 | T4 | Owner refusal and lifetime expiry: owner binding is modelled; check whether expiry is a model action. | Carry the 31-day expiry case into the replay driver if the model has no clock step. | Low |
| 2 | 41-72 | T4 | CAS conflict merge, 3-attempt give-up and disconnect fence are model scenarios. | Drop if the replay covers them (verify on port). | Low |
| 3 | 74-83 | T4 | Entry bound duplicates replay case 3; the 5 MB oversize refusal is not obviously modelled. | Carry the oversize case. | Low |

## Proposed end state
File deleted; at most two cases (lifetime expiry, oversize body) move into the replay test as plain cases on the real module.
