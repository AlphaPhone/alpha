# test/browser/password-provider-storage.spec.ts
- Lines: 18 | Kind: Playwright, chromium + firefox + webkit (listed in `scripts/storage-specs.ts`); module-in-page: patches `passwordProviderDocument.read` and calls `openPasswordProvider()` directly | Verdict: DELETE (carry one case into `journeys/settings.spec.ts`)
- Covers: a pending development password-provider open cannot show its dialog after Home/Back/device-state/incoming call; a sample fill cannot restore retired vault content after an awaited read; damaged provider bytes can be downloaded and reset only after confirmation. Duplicates: `dev-password-provider.spec.ts` (retirement on Home/device events, rendered), `product-recovery-entry.spec.ts` and `preference-storage-migration.spec.ts` (same recovery dialog pattern), `reset-only.production.spec.ts`. Callers: `scripts/storage-specs.ts:5` (cross-browser lane).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 8, 10 | T6 | Monkey-patches `store.read` and invokes `openPasswordProvider('install'|'open')` and `store.edit` from `/src`; no user opens anything. | Rendered equivalent: open the development provider from Settings, press Home before it appears (harness holds the storage read at IndexedDB level); expect no dialog. | Low. |
| 2 | 14 | A1 (C6) | Damage is seeded by writing the **legacy** localStorage key `alpha.browser.password-provider.v1`, which only the legacy import path in `domain-document.ts:43-47` reads. That path is a C6 delete, after which this seed creates nothing. | Delete with C6; if damaged-document recovery stays, seed damaged bytes into the current document store instead (one case in the recovery journey). | None. |
| 3 | 16-17 | D3? | Recovery offers "Download password provider backup" of the damaged bytes. | Owner question (whether damaged-store byte download stays; see chunk summary). | — |
| 4 | 2-17 | D8 | Each test is one ~700-character line. | Gone with the file. | None. |
| 5 | — | P1 | Running a dev-simulator retirement race in Firefox and WebKit adds two browser runs for code that ships only in the Android WebView. | Remove from `STORAGE_SPECS`. | None. |

## Proposed end state
File deleted and removed from `scripts/storage-specs.ts`. `journeys/settings.spec.ts` (Passwords) gains one case: Home during a pending development-provider open shows no dialog and a filled sample is cleared. Damaged-provider recovery is either one case in the recovery journey (current-store seed) or deleted, per owner answer.
