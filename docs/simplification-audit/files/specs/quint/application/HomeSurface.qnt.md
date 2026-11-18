# specs/quint/application/HomeSurface.qnt
- Lines: 103 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP (already import-based)
- Covers: Home agenda memo (choice valid until the next candidate end, overdue leads) and the storage probe answered once per interval (`createHomeAgenda`, `createStorageAccessCheck` in `apps/app/src/prototype/home-cards.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); `test/quint-home-surface.test.mjs` (imports `home-cards.ts` directly; not in the aggregate)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test 8 | — | Refinement already imports the real module and replays simulator traces: the target pattern for every other harness. | None. | none |
| 2 | manifest symbols | T10 | Symbol pins on `home-cards.ts` names; B199 removes aliases from home-cards.ts (check none of them is pinned). | Pin the file only. | L |
| 3 | — | A | `data-adapter.ts` listed as source (its home-values split, cross-file-actions §778) — update manifest path when it moves. | Path update. | L |

## Proposed end state
- Unchanged model and test.
- Manifest pins `home-cards.ts` (and the new home-values file) as files.
