# test/browser/calendar-fixture.ts
- Lines: 8 | Kind: Playwright helper (in-page function `holdCalendarTransactions`) | Verdict: DELETE
- Covers: opens `alpha.browser.documents.v1` and keeps a readwrite transaction alive so Calendar reads queue behind it. Duplicates: `helpers/calendar-storage-hold.ts` (`holdDocumentsTransaction`, same DB/store/technique) and the inline copy in `calendar-form-draft.spec.ts:69-74`. Callers/importers: only `calendar-storage-migration.spec.ts:2` (git grep; the `'calendar-fixture'` string in `test/fixtures/isolated-native-campaign.mjs:58,149` is an AVD name, not an import).

## Proposed end state
Deleted with `calendar-storage-migration.spec.ts`. One `holdDocumentsTransaction(page)` in `harness/storage.ts` (from `helpers/calendar-storage-hold.ts`) serves every remaining caller.
