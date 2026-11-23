# specs/quint/legacy/settings-nav/check-settings-nav-refinement.mjs
- Lines: 314 | Kind: Quint refinement harness, historical comparison (Vite + Chromium with native/resident stubs; replays into `test/fixtures/quint/SettingsNavComparison.qnt` → `legacy/SettingsNav.qnt`, two replay modules) | Verdict: DELETE
- Covers: Settings → About → Licenses (search filter, "No matches", React notice detail, `alpha-back` returns retaining search), Settings → Apps → Calendar/Passwords and back, Account sheet → Sign out → confirmation dismissed with the Cloud owner unchanged; root has no Wi-Fi row. Duplicates: `test/browser/settings-navigation.spec.ts` (navigation/back), `user-selected-settings.production.spec.ts` (license search, Sign out?), `settings.production.spec.ts`, `owner-settings-review.spec.ts`, `test/browser/helpers/cloud-plan-settings.ts`; live models `application/SettingsPageFocus.qnt`, `SettingsSession.qnt`. Callers/importers: `test/quint-legacy-settings-nav-refinement.test.mjs:4`, `specs/quint/refinement/legacy/index.mjs:9` (both DELETE; the aggregate also carries a `settingsNavDifferences` table for these IDs). No live harness imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 205-216, 303-312 | P6, T4 | Five expected mismatch receipts (`SettingsNavCurrentDirectSignOut`, `…CurrentRootWifi`, `…CurrentLicenseDetails`, `…ProposedLicenseDetails`, `…ProposedInfoRows`) pin drift from the historical design; the aggregate duplicates their labels. | Delete harness and the `settingsNavDifferences` table in `refinement/legacy/index.mjs`. | Low |
| 2 | 260-264 | T10 | Splices `window.quintLegacySettings = value;` after `'shell = value;'` in `main.tsx`; reads `S().view` and `vget('settings').page` shell internals (l.59-60, 70-71). | Goes with the file. | None |
| 3 | 27-51 | T7 | Re-serialises `flagOffAndroid` and `residentStub` init scripts by `toString()` into one `addInitScript` string and patches `Capacitor.PluginHeaders` for `AlphaNotifications`/`AlphaHostedResults`; a third copy of the native-fixture adaptor pattern. | Goes with the file. | None |
| 4 | 34-36 | — | Synthetic account fixture (`settings@example.invalid`, fixed token/userId); test-only data, no real credential. | None. | None |
| 5 | 227-228 | C (dup) | `'upstream.lock.json'` listed twice in `sources` (harmless inside the `Set`). | Goes with the file. | None |
| 6 | 247-249 | T8 | Unlike its siblings, the Vite server keeps HMR and file watching on, so an edit during the run can reload the page mid-replay. | Goes with the file. | None |
| 7 | 237-240 | — | Asserts packaged `third-party-notices.json` contains exactly one `react` notice at the lockfile version. That is a release-artifact rule. | If wanted, belongs in `scripts/audit-production-bundle.ts`, not a formal harness (owner question). | Low |
| 8 | — | Cost | One Chromium page; ~20-30 s per run, repeated by the legacy aggregate. | Saved. | — |

## Proposed end state
Directory, `SettingsNavComparison.qnt`, legacy test and aggregate entries deleted. Settings navigation, license search/detail/Back and sign-out confirmation remain in `journeys/settings.spec.ts` (merged from the specs listed above); make sure that journey asserts native `alpha-back` from the license detail retains the search text and that dismissing "Sign out?" keeps the session.
