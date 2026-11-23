# scripts/owner/input.ts
- Lines: 16 | Kind: shared script helpers (`option`, `isRecord`, `isSafeInteger`, `errorCode`) | Verdict: MERGE into `scripts/lib/` (shared args/guards module)
- Covers: no behaviour of its own. Duplicates: `isRecord` is one of ~35 plain-object guards (e.g. `native-google-host-artifact.ts:13` `record`); `option` is one of ~14 arg parsers (`gh-readonly.ts:122` `parseArgs` in the same folder); `errorCode` twins `fixtureCommandError` in `native-test-fixture.ts:80`. Callers/importers (grep of the whole repo): `scripts/owner/emulator-campaign-check.ts`, `merge-review.ts`, `pilot-rotation.ts`, `pilot-rotation-journal.ts`. The scripts research's listing of `test/embedding-artifact-inputs.test.py` is a false positive (that file mentions an unrelated `unreviewed/input.ts` string); so is `specs/quint/refinement/services/workflow-engine/index.mjs:336` ("version/owner/input equality").

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-16 | C3 | Generic helpers in an owner-specific folder. After the incident tools are deleted, only `pilot-rotation*.ts` use it. | Move `isRecord`, `isSafeInteger`, `errorCode` into `scripts/lib/guards.ts` and `option` into the shared arg helper; delete this file. | None |

## Proposed end state
File removed; its four functions live once in `scripts/lib/` and every script's local copies point there.
