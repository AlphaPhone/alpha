# test/browser/browser-secret-retirement.spec.ts
- Lines: 39 | Kind: Playwright, chromium, 1 test; module-in-page (T6/P1): no locator, no user action | Verdict: REWRITE as one case of a Node storage-contract integration test (`test/browser-storage-contract.test.mjs`, real module + fake-indexeddb), or DELETE if the owner confirms the web secret store is developer-only
- Covers: `createBrowserConnection()` secure-slot storage (IndexedDB `alpha-connection-secrets.v1`) reports one fixed message on read/remove/CAS failure, never a sign-out, and its compare-and-clear refuses a replaced generation. Duplicates: none (the message string appears in no other test). Callers/importers: chromium project only; imports nothing from `test/`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-39 | T6 | Whole test is `page.evaluate(import('/src/runtime/native-connection.ts'))`; it boots the full dev server and app to call a storage function. | Run the same assertions in Node against the real module with a fake IndexedDB (failure injected at `IDBFactory.open`, the real boundary). | Low |
| 2 | name | D11 | The name says "retirement" but nothing is retired: this is the current web fallback slot store (`native-connection.ts:162,214`). The research report's "legacy-data path: delete" label is wrong. | Name the case after the behaviour. | None |
| 3 | 15-23 | P3 | Patches `IDBFactory.prototype.open` in page. Acceptable boundary (storage), but restores manually in `finally`. | Same injection in Node is scoped to the fake. | None |
| 4 | 8 | C6 | `'cloud:production'` literal (32 copies across Java/TS per C6). | Import the slot constant if the test moves to Node. | None |

## Proposed end state
One Node integration case (about 20 lines) importing `createBrowserConnection` and running against fake-indexeddb: denial of all three operations yields the fixed message; retained value readable after recovery; stale compare-and-clear returns `conflict`; unrelated slot untouched. Keep only if `createBrowserConnection` remains a shipped web path (owner question); otherwise delete with the dev-only store. Delete this spec.
