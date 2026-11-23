# specs/quint/legacy/home-layout/check-home-layout-refinement.mjs
- Lines: 442 | Kind: Quint refinement harness (historical, legacy family): Vite dev server + Chromium mount of flag-off Home and Settings, replayed against `legacy/HomeLayout.qnt` and `test/fixtures/quint/HomeLayoutComparison.qnt` (`HomeLayoutCurrentReplay`) | Verdict: DELETE; carry two cases into `journeys/home-shell.spec.ts`
- Covers: Home hides empty cards, late native inset read moves the app grid, Workflows/Inbox/Brief/Calendar cards appear once content exists (unread header without snippet), focused composer + reduced viewport docks to keyboard and returns to bar, failed Calendar read removes the event card, Home reads no mail bodies / sends nothing / runs no digest; HOME role offered in Settings › General, declined once then granted, absent in standalone; plus three expected mismatches against historical profiles.
- Duplicates: `test/browser/home-daily-overview.spec.ts` (empty cards hidden at :360, workflows card at :440, Calendar failure at :215), `home-attention.spec.ts:60`, `home-inbox.spec.ts`, `home-brief-result.production.spec.ts:255`, `settings-device-facts.spec.ts:76-110` (HOME role offer/decline/grant/absence), `home-compact-scroll` / `home-chat-anchor` (viewport resize); live models `application/HomeSurface`, `DockClearanceOwnership`.
- Callers/importers: `specs/quint/refinement/legacy/index.mjs:5,134`, `test/quint-legacy-home-layout-refinement.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 333-352, 431-440 | P6 / T4 | Three of five traces are built to fail (`assert.rejects(... /Source\/model trace mismatch/)`) against profiles the README admits the owner-approved renderer no longer follows. | Delete. | None |
| 2 | 355-389, 411 | B5 / T10 | `captureInputs` hashes all of `apps/app/src`, `.eliza/client-features`, vendor plugin trees, configs; Vite transform asserts eight watched files (`main.tsx`, `prototype/data-adapter.ts`, `home-overview-cards.ts`, `home-shell.ts`, `settings-adapter.ts`, `automations-adapter.ts`, `inbox-cloud-adapter.ts`, `chat-overlay-motion-adapter.ts`) are byte-identical and all loaded. Pins paths that the stage F `model.js`/adapter restructuring will move. | Delete. | None |
| 3 | 27-114 | T7 / C5 | Hand-rolled `addInitScript` collector wrapping `flagOffAndroid` + `residentStub`, patches `Capacitor.PluginHeaders` and `nativePromise` for `ElizaSystem`, `DailyApps.surfaceInfo`, `Agent.request`, Gmail search. Same adapter is copied in `legacy/chat-input/check-chat-input-refinement.mjs:86-109`. | Goes with deletion; the shared `test.extend` harness owns these fakes. | None |
| 4 | 142-149 | B4 | `project()` has an empty `if (profile === 'current') {}` block. | Goes with deletion. | None |
| 5 | 116-140 | T6 | State derived by regex over card text (`/Nothing planned|No upcoming events/`, `/Connect email/`) inside `evaluate`; copy changes break it. | Journey uses role/locator assertions. | — |
| 6 | 228-236 | — | Late native inset readback (`DailyApps.surfaceInfo` held until released) moves the grid; asserts `--native-top-inset` is set and layout settles. No Playwright spec found that delays `surfaceInfo` and checks the grid re-lays out (`git grep topInset test/browser` finds only static values). | Carry into `journeys/home-shell.spec.ts`: "Home lays out before native insets and re-lays out once they arrive, no page error". | Medium (only coverage) |
| 7 | 312-322 | — | Focused composer with reduced viewport switches dock to keyboard, restore returns to bar and blurs. Partly in `home-chat-anchor.spec.ts:45` (viewport resize) — unclear whether dock state is asserted. | Carry if `home-chat-anchor` does not assert dock/blur. | Low |
| 8 | 327-332 | — | Home reads no mail bodies, sends nothing, runs no digest, posts nothing. Privacy rule; `home-inbox.spec.ts` uses body fixtures but the explicit "zero body reads" assertion was not found. | Add one assertion to the Home inbox journey (`journeys/home-shell.spec.ts` or `journeys/inbox.spec.ts`). | Medium |
| 9 | 172-198, 252-262 | — | HOME role decline-then-grant and standalone absence: covered by `settings-device-facts.spec.ts:76-110`. | No carry. | None |
| 10 | 9-12 | — | Imports `test/browser/flag-off-android.ts` (`flagOffAndroid`, `fenceNetwork`, `residentHome`), `resident-stub.ts`, `helpers/home-calendar.ts`; all have other importers in `test/browser`. | None. | None |
| 11 | — | P1 | Cost: Vite + Chromium, two scenarios with 120-frame settle loops, five checker runs in `node --test`. | Removed. | — |

Product files read as text / hashed: all of `apps/app/src`, `.eliza/client-features`, two vendor plugin `src` trees,
`vendor/eliza/packages/core/src/utils/uuid.ts`, `apps/app/index.html`, `vite.config.ts`, `package.json`,
`package-lock.json`, `upstream.lock.json`. Markers: none sliced; data attributes `data-alpha-home-*`,
`data-mobile-shell-tile`, `data-alpha-composer`, `data-alpha-input-bar`, `.home-date-setup`, CSS var
`--native-top-inset`; storage slot `cloud:production`. All watched product files still exist.

## Proposed end state
Delete this file, `home-layout/README.md`, `legacy/HomeLayout.qnt` (+ manifest entry, `quint-model-check.yml` compare
list), `test/fixtures/quint/HomeLayoutComparison.qnt`, `test/quint-legacy-home-layout-refinement.test.mjs`, and the
`HomeLayout` entry + `homeLayoutDifferences` in `specs/quint/refinement/legacy/index.mjs`. First add to
`journeys/home-shell.spec.ts`: late native-inset arrival re-lays out Home (finding 6) and "Home reads no mail body and
sends nothing" (finding 8); check finding 7 against `home-chat-anchor.spec.ts`.
