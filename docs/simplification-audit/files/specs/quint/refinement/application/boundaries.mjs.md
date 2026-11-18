# specs/quint/refinement/application/boundaries.mjs
- Lines: 123 | Kind: three small Quint refinement adapters (two transplants via `sourceContext`, one real import of a test fixture host) | Verdict: SPLIT; `filesAndSharing` PORT, `notificationCollection` PORT, `developmentHost` KEEP (move)
- Covers: `FilesAndSharing` (Files → email attachment review re-reads bytes before insert), `NotificationCollection` (browser notification policy, preview/secret redaction, lock-screen redaction), `DevelopmentHost` (dev Cloud-resident host bind/reuse/clear/close). Models all live in `specs/quint/application/`. Duplicates: notification redaction also in Playwright notification specs; attachment review in inbox host tests (`test/inbox.test.mjs`, reviewer verdicts elsewhere). Callers/importers: `index.mjs` only (no per-model wrapper; `git grep "application/boundaries"` hits only itself and the README).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-31 | T2 | `filesAndSharing` loads `apps/app/src/prototype/file-email-review.ts` with `sourceContext` (strip types, delete `import`/`export` lines, `vm` eval) and re-supplies its three imports by hand. The module is a normal ES module (`reviewFileEmail` export). | `bundledSource('apps/app/src/prototype/file-email-review.ts')` with JSDOM globals installed (`window`, `document`, `getComputedStyle`); the real `holdPhoneInert`, `reviewMailAttachment`, upstream `describeEmailTarget` then run. | Low |
| 2 | 61-71 | T2/T3 | `notificationCollection` transplants `apps/app/src/browser/notifications.ts` and stubs 20 of its imports (`readDevicePreferences`, `BrowserCalendar`, `browserHostedResults`, `listWorkflowNotices`, `notificationDocument`, `revision`…). This is a unit test of one class with everything faked. | Run it as a Playwright journey step (`journeys/notifications.spec.ts`: enable policy, inject secret/preview notice, lock, read list) that feeds `checkTraces`, or bundle the real module with an esbuild alias only for `notification-store` (the document port). | Med |
| 3 | 64 | A3 | Stubs `browserHostedResults` — hosted-agent results are D5 delete scope; when that module goes, `notifications.ts` changes and so does this stub. | Track with D5. | Low |
| 4 | 93-123 | (keep) | `developmentHost` imports `test/fixtures/product-character-host.mjs` and runs the real `scripts/cloud-resident-host.ts` logic (reviewer: KEEP, dev-server host) with a launch port. No slicing. | Keep; move into its own file `development-host.mjs` so each harness file maps to one model. | – |
| 5 | 10-12, 95-99 | B5 | `captureSources` at module load (side effect on import) and a separate esbuild metafile walk solely for hashing. | Drop. | None |
| 6 | 1-123 | C5 | Three unrelated models in one file named `boundaries`; index imports three names. | Split into `files-and-sharing.mjs`, `notification-collection.mjs`, `development-host.mjs`. | None |

## Proposed end state
Three files of ~35-45 lines each, all importing real modules (bundled), no module-load side effects, no hashing. If
`notificationCollection` moves into a Playwright journey, delete its file and point the model's runner at the journey.
