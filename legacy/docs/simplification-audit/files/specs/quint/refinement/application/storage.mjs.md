# specs/quint/refinement/application/storage.mjs
- Lines: 53 | Kind: Quint refinement harness on the real bundled `BrowserDomainDocument` with a controlled Documents CAS port | Verdict: KEEP (trim; currently out of sync with product)
- Covers: `DurableStore` — `apps/app/src/browser/domain-document.ts` envelope read/edit/CAS: a competing write fails the edit, a persistence failure leaves bytes intact, an uncontended edit commits. Duplicates: browser storage/recovery host tests and the Notes/Calendar storage specs exercise the same class indirectly. Callers: `index.mjs` aggregate only (`durableStore`). No per-model test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10, 24-25, 35, 39-45 | A1 / D1 | The `legacy` race passes a legacy getter `() => legacy` and expects `readRaw()` to reject `/Older browser data changed/`. This branch removed the getter, `readOrCreate` and the legacy check from `BrowserDomainDocument` (constructor now `(documents, key)`, `legacy` always written `null`). The `legacy` case now fails and `readOrCreate` in the port is dead. | Delete the `legacy` race, the legacy getter, `readOrCreate`; seed snapshots with `legacy: null`. Remove legacy fields/actions from `DurableStore.qnt` (24 mentions). | M (harness broken now) |
| 2 | 30-46 | D8 | `JSON.parse(JSON.parse(staged.raw).value).text` repeated five times. | One `valueOf(raw)` helper. | L |
| 3 | 49-52 | — | Assumption text mentions legacy atomicity. | Update with item 1. | L |
| 4 | — | coverage | Only reached via the aggregate the plan deletes. | Add a per-model test entry. | M |

## Proposed end state
Three races (none, current, failure) on the real class, model without legacy state, own per-model test.
