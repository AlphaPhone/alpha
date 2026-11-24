# test/browser/dev-wallet.spec.ts
- Lines: 17 | Kind: Playwright, chromium; UI journey of the development Wallet simulator | Verdict: DELETE
- Covers: development card add/lock/default/remove, transit top-up and simulated payment persistence in `alpha.dev.app.wallet`. Duplicates: none. Callers: chromium only.

Wallet is deferred and removed from MVP (PRD AP-13; DECISIONS D2). The spec only keeps the Wallet simulator alive. It also patches `Storage.prototype.setItem` six times (P3). Delete with the Wallet views, fixtures and simulator; `dev-workflow-receipts.spec.ts` ("Add the amount to Wallet") goes with it.
