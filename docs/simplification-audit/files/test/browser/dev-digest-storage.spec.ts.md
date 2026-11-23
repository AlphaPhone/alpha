# test/browser/dev-digest-storage.spec.ts
- Lines: 20 (1 test) | Kind: Playwright `chromium`, dev build; module-in-page unit test (3 `/src` imports, 0 locators) | Verdict: **DELETE**
- Covers: `browserDigestStore` rejects a stale write, a second pending write, an out-of-scope slot, and writes after its connection retires. Duplicates: `specs/quint/refinement/services/development-digest-pending.mjs` and `test/quint-development-digest-pending.test.mjs` model pending recovery. Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-19 | T6, T3 | Imports `digest-storage.ts`, `development-identity.ts`, `device-actions.ts` and calls them; no user action (research P1 example). | Delete. | Low: the compare-and-swap conflict is covered by the Quint pending model, not by an e2e. |
| 2 | 8 | P2 | Writes `alpha.connection.selection.v1` in-page. | Gone. | none |

## Proposed end state
Deleted.
