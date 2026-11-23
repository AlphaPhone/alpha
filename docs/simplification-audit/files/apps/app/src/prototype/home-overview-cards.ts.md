# apps/app/src/prototype/home-overview-cards.ts
- Lines: 125 | Role: Renders Home's agenda, mail, Messages/Phone and brief cards as upstream `OverviewCards` React elements from the final `renderVals` values, installed as the outermost Home `renderVals` wrapper. | Verdict: SIMPLIFY
- Importers: `main.tsx:78,186` (`installHomeOverviewCards`). `homeAgendaCard`, `homeAttentionCard`, `homeTelephonyCard`, `homeBriefCard` are exported but used only inside this file and by `test/home-overview-cards.test.mjs`. Template binds `{{homeAgendaCard}}`, `{{homeAttentionCard}}`, `{{homeBriefCard}}` (`template.html:45,58,60`).
  Text/path pins: `test/home-cards.test.mjs:105,164` (regex on this source, T1); `test/home-overview-cards.test.mjs` (esbuild-bundles this file + upstream cards and regex-matches static markup, B/T3; also `node -e` inline program); `specs/quint/native/manifest.json:4538`; `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs:357`; `specs/quint/ui-return-review-20261109.md`; `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 60-65 | B4 | After the guard at 60 (`out.homeInboxHasRows !== true \|\| !Array.isArray(out.homeInboxRows) \|\| out.homeInboxRows.length === 0` → return null), line 61 re-checks `Array.isArray(out.homeInboxRows) && out.homeInboxHasRows !== false`, and 65 branches on `rows.length ? '' : …` (always non-empty) including an `out.homeInboxState === 'pending'` arm | `const rows = out.homeInboxRows.map(…)`; `title: String(out.homeInboxTitle \|\| '')`, `status: String(out.homeInboxStatus \|\| '')` | None (pure simplification; same output for every reachable input) |
| 2 | 99-103 | B4 | `if(out.homeBriefHas!==true)return null; const retained=out.homeBriefHas===true` → `retained` is always true; three `retained ? … : 'Your brief'` ternaries have a dead side | Remove `retained`; `title: String(out.homeBriefTitle \|\| 'Your brief')` etc. | None |
| 3 | 11, 60, 121 | A5 | `out.homeShowCalendar === false`, `out.homeShowInbox === false`, `out.homeShowWorkflows !== false` — the only writer sets them to constant `true` (`data-adapter.ts:203`) | Delete the three checks together with `installHomeCardVisibility` (see data-adapter report #11) | None |
| 4 | 74 | NEW (cross-card flag) | Mail card people visibility reads `out.homePeopleVisibility`, which `home-cards.ts:102 homeCalendarValues` derives from the **calendar** item's attendees; `data-adapter.ts:149,236` writes a separate `homeAttentionPeopleVisibility` that nothing reads. In production `homeAttentionPeople` is always `[]`, so the row never shows | Read `homeAttentionPeopleVisibility` (or derive from `people.length`) and delete `homePeopleVisibility` | Low; fixture Home only |
| 5 | 6-7 | C3 | `maskIcon` builds `url('/icons/lucide/${name}.svg')` by hand (8 such builders, research P13) instead of `iconStyle()` (`apps/app/src/icon-style.ts`), which also validates the name against the catalog | Use `{...iconStyle(name), backgroundColor: color}` | Low visual (iconStyle sets `display:inline-block`, `24px`) |
| 6 | 20, 68, 87, 103 | B2 | `typeof out.goCalendar === 'function' ? out.goCalendar : undefined` — the writers (data-adapter, inbox-cloud-adapter, workflow-adapter, telephony-attention) always provide functions in production | Keep only where a value can legitimately be absent (telephony cards off-image: `onActivate` param); type `out` as `HomeValues` and drop the checks | Low |
| 7 | 3, 10, 59, 98 | C1 | `Bag` for render values | `HomeValues` type exported by the Home owner listing the `home*` keys | None |
| 8 | 37-51, 32 | D12 | Card look as inline React style objects (`ROW_CARD_STYLE`, `ROW_CARD_PARTS`, agenda style) | Move to CSS classes in `phone.css` (classNames are already passed) | Low visual |
| 9 | 10, 59, 83, 98 | D7 | Four card builders exported only for `test/home-overview-cards.test.mjs` | Unexport when that test is retired/merged (research tests-host row: "delete if browser Home specs cover") | None |
| 10 | 115-125 | D2 | Another `renderVals` monkey-patch with an "install outermost" ordering requirement (comment 112) | Hook registry with explicit order (research P1/P3) | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 3 | ~60 files | `HomeValues` type |
| `flag` | helper | 5 | `String(bool)` inline elsewhere | stays |
| `maskIcon` | helper | 6-7 | `icon-style.ts iconStyle`, `home-shell.ts:13 glyph`, `media-review-controls.ts:5`, `workflow-filters.ts:19`, `runtime/calendar-sync-settings.ts:10`, `runtime/google-connection-ui.tsx:19`, `camera-adapter.ts:831` | `iconStyle` |
| `ROW_CARD_STYLE`, `ROW_CARD_PARTS` | const | 37-51 | none | CSS classes |
| `INBOX_STATES` | const | 53 | upstream `OverviewInboxCardModel['state']` union | import the upstream type/list |

## Proposed end state
~105 lines: card builders without impossible-state ternaries or constant-flag checks, icons via `iconStyle`, typed values, mail card visibility from its own key. Later the inline style objects move to CSS (~-15 lines) and the install becomes a registered Home hook.

## Verification
`test/home-overview-cards.test.mjs`, `test/home-cards.test.mjs` (regexes on this file), `test/browser/home-daily-overview.spec.ts`, Home browser specs (production variant too), `npm run verify`.
