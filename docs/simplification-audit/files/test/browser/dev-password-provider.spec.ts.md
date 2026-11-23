# test/browser/dev-password-provider.spec.ts
- Lines: 24 (6 KB) | Kind: Playwright, chromium; UI journey on the development password provider, with raw-document reads and one IndexedDB patch | Verdict: MERGE into `journeys/settings.spec.ts` (Passwords section)
- Covers: Settings → Apps → Passwords: add the development provider, choose it, open/unlock/lock the sample vault, fill only a disposable sample, and retire state on Home/device events. Duplicates: `password-provider-setup.spec.ts` (handoff/selection states), `password-provider-storage.spec.ts` (storage lane, cross-tab), `journey-e-browser-credentials.spec.ts` (uses "Add development provider"). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 11, 17, 20 | T6 | Six `import('/src/browser/preference-documents.ts')` reads of `passwordProviderDocument.readRaw()` to assert persistence. | Assert persistence through reload + visible "Development provider selected" text; keep one raw check that the stored document never contains the sample password (line 8, a privacy rule). | Low. |
| 2 | 11 | P3 | `IDBObjectStore.prototype.put` patched to fail for one key. | Harness storage fault injection. | Low. |
| 3 | 16-18 | T4 | Cross-tab stale choice: covered by `password-provider-storage.spec.ts` (storage lane). | Drop here. | None. |
| 4 | 19-21 | C6, T6 | Holds the internal Web Lock `['browser-document','alpha.browser.documents.v1',key]`. | Drop. | Low. |
| 5 | 14, 23 | P2 | Retirement via `dispatchEvent('alpha:device-state')` / `'launcher-home'`. | Use Device controls → Home/Power in the journey. | None. |
| 6 | 4-6 | — | Good local helpers `settings/install/select`. | Become journey-local steps. | None. |

## Proposed end state
Three cases in `journeys/settings.spec.ts`: (1) install → select → reload keeps selection → unlock → fill sample → lock; stored document has no secret (line 8); (2) Cancel and a failed save never show the provider as installed (line 11); (3) Home clears filled sample, provider can be set to None (line 23). Delete the rest.
