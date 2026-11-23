# test/pilot-rotation-journal.test.mjs
- Lines: 84 | Kind: tooling (real `scripts/owner/pilot-rotation-journal.ts` on a temporary filesystem; one case mocks `fs.openSync`) | Verdict: MERGE into `test/release-tooling/pilot.test.ts`
- Covers: the owner-only rotation journal used by `scripts/pilot-update.ts`. A lost installer response stays `unknown` and forbids a second dispatch; a terminal result must match the durable intent; parent directories are fsynced. Duplicates: `specs/quint/refinement/services/pilot-update.mjs` (drives the real `claimPilotInstall`, `beginPilotRotation`, `completePilotRotation` and `inspectPilotRotation` through 12 traces, including `lost-install` and "do not dispatch again", line 164); `test/pilot-update-export.test.mjs:241-273`. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-48 | T4 | Lock held, lost installer response, `observePilotRotation` previous/replacement, no re-dispatch: the Quint refinement and `pilot-update-export.test.mjs:241` cover the same path. | Drop. | none |
| 2 | 50-66 | — | A terminal result whose intent pin does not match is refused, and `verified-applied` with an unmatched device observation stays non-replayable. Not in the refinement's trace list. | Carry into `test/release-tooling/pilot.test.ts`. | none |
| 3 | 69-84 | T3 | Spies on `fs.openSync` to assert the order of directory fsyncs. This tests an implementation detail through a mock. | Drop; keep only the `inside its durable anchor` refusal (one line) in the merged file. | low |
| 4 | 9-18 | C3 | `device`, `before` and `intent` fixtures are re-declared; `test/fixtures/pilot-update.mjs` has the same shapes. | Use the shared fixture in the merged file. | none |

## Proposed end state
Deleted as a file. `test/release-tooling/pilot.test.ts` keeps one journal case (terminal mismatch and unmatched observation) and
the anchor refusal. The lost-install and re-dispatch rules stay proven by the `PilotApkUpdate` Quint refinement.
