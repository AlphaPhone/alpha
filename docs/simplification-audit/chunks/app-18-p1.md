# Chunk app-18-p1: `apps/app/src/prototype/template.html` lines 1-2296

Report: [`files/apps/app/src/prototype/template.html.part1.md`](../files/apps/app/src/prototype/template.html.part1.md)

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/template.html (1-2296) | SIMPLIFY (move dev-only regions to spliced development HTML; delete dead Home date line; style classes) | 2,296 | ~1,620 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| Storage warning block | markup | template.html:34, :104 | template.html:4521 | one `<details role="alert">` form |
| Home date line | markup | template.html:35, :105 | template.html:4522; phone.css:858-860 | delete |
| Calendar event block | markup | template.html:1093-1097 | template.html:1104-1108 | one block + `.calendar-block` |
| Photo tile | markup | template.html:1866-1879 | template.html:1956-1967 | `.photo-tile` classes |
| Form/edit draft recovery rows | markup | template.html:1030-1038, 1248-1251 | calendar-form-draft-adapter.ts, calendar-edit-draft-adapter.ts, canonical-calendar-drafts.ts | one `sc-for` over a merged `calendar-drafts.ts` |
| Private-tab icon path | const (SVG path) | template.html:1391, 1570, 1635 | none in `IC` | `model.js` `IC.privateTab` |
| Sparkle / chevron / retry / bubble paths | const (SVG path) | template.html:163, 198, 205, 525, 533, 546, 550, 587 | `IC` has near twins (`ic.bubble`, `ic.phRotate`, `ic.up/down`) | reuse `IC` entries |
| Lucide mask inline style | const (style) | template.html:52, 766-768, 783 | `.mail-toolbar-icon` phone.css:589 | `.lucide-icon` class |
| Browser menu item style | const (style) | template.html:1630-1646 (15×) | — | `.browser-menu-item` |
| 44px initials avatar style | const (style) | ~20 sites (74, 135, 174, 263, 514, 565, 862, 933…) | `.mail-sender-avatar` | `.avatar-44` |
| Sheet grabber style | const (style) | template.html:477, 1589, 1656, 2073, 2137, 2178 | part 2, development-*.html | `.sheet-grabber` |
| App header bar style | const (style) | 20+ `data-alpha-app-header` sites | part 2 | `.app-header` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| Home date line (35, 105; also 4522) + `.home-date-*` CSS + `homeShowDate/homeShowSetup/homeDateLabel/connectGoogle` in `installHomeCardVisibility` | `data-adapter.ts:203-206` hard-sets them false/empty; installed unconditionally `main.tsx:183`; no other producer (git grep) | Confirmed |
| Prototype Phone (222-492) out of production template | only `model.js:440,764,3578` set `nativePrototype:true`; `phone-adapter.ts:215`/`sms-adapter.ts:263` force false; Phone admitted only on AOSP image or dev profile (`mvp-features.ts`) | Confirmed (move to dev HTML; delete if simulator retires) |
| Prototype Messages (597-756) | `messages.nativePrototype` forced false by `sms-adapter.ts:263`; local draft controls fed only by `browser/simulated-messages.ts` | Confirmed (move) |
| Canned Browser pages, Nopa booking, confirm sheet, agent banner/cursor (1417-1423, 1426-1475, 1495-1555, 1561-1563, 1583-1599) | `browser-adapter.ts:471-473` sets `isNews/isEnc/isBook/isSearch/isGeneric/agOn/confirm:false`; `heroArt/genLinks/bkName/hl1/cf` only in model.js | Confirmed (move) |
| Browser site-permission sheet (1611-1622) | `perm` produced only in model.js | Confirmed (move) |
| Calendar invites + RSVP (1052-1065, 1181-1188) | only fixture events carry `invite` (`fixtures.js:184`, model.js); `native-adapter.ts:227` scrubs rsvp/invite handlers | Confirmed (move) |
| Photos people carousel + info place/people (1903-1914, 2082-2098) | `camera-adapter.ts:1490,1630` set `hasPeople/hasPlace:false` | Confirmed (move) |
| Maps `notNative` row (2231) | `maps-adapter.ts:248` `notNative:false` | Confirmed (move) |
| Photos in-app share sheet (2133-2160) | production share is native (`camera-adapter.ts:1531,1601`); `sheet:'share'` still settable from model.js paths | Suspicion — verify with production probe |
| Undo overrides once markup is gone: `browser-adapter.ts:471-473` false flags, `camera-adapter.ts:1490,1630` false flags, `native-adapter.ts:227` rsvp/invite and `openBook/openEnc/cfOk` scrub arms | They neutralise prototype values whose markup no longer ships | High, after the move |

## Cross-file actions
1. **Dev-region splice** — `apps/app/src/prototype/template.html` (cut regions, add marker comments), new `apps/app/src/prototype/development-views.html` (or extend `development-system-surfaces.html`), `apps/app/src/prototype/template-source.ts` (add one `.replace(marker, testMocksEnabled ? … : '')` per region), `scripts/audit-production-bundle.ts` (assert "Nopa", "Confirm booking?", "{{phone.cName}}" absent), `test/phone-adapter.test.mjs:137` (delete T1 order assertion), `test/theme-palette.test.mjs:10` and `test/product-identity.test.mjs:147` (add the new HTML file to their file lists), `test/support/feature-parity.mjs:39,433` (template-source entry), `specs/quint/application/manifest.json` (add new file where template.html is listed for affected models).
2. **Remove undo layers after the splice** — `apps/app/src/prototype/browser-adapter.ts:471-473`, `apps/app/src/prototype/camera-adapter.ts:1490,1630`, `apps/app/src/prototype/maps-adapter.ts:248` (`notNative`), `apps/app/src/prototype/native-adapter.ts:227` (rsvp/invite arm) and its book/enc/cfOk cases; keep model.js producers for the dev build.
3. **Home date line removal** — `template.html:35,105,4522`, `apps/app/src/prototype/data-adapter.ts:199-207`, `apps/app/src/main.tsx:183` (`openGoogle` argument), `apps/app/src/prototype/phone.css:858-860`, `test/final-ui-lifecycle.test.mjs:17`, `test/browser/home-attention.production.spec.ts:8,17,19`, `test/browser/home-daily-overview.production.spec.ts:15`, `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs:127`.
4. **Calendar draft rows merge** — `template.html:1030-1038,1248-1251`, `calendar-form-draft-adapter.ts`, `calendar-edit-draft-adapter.ts`, `canonical-calendar-drafts.ts`, `main.tsx:133-134`, calendar draft browser specs.
5. **Style classes** — `template.html` (all views), `apps/app/src/prototype/phone.css` (new classes; drop matching `!important` fights), screenshot specs (`test/browser/design.spec.ts`, `responsive-surfaces.spec.ts`).
6. **Icon literals into IC** — `template.html` (paths listed above), `apps/app/src/prototype/model.js` `IC` and `ICON_ASSETS`, `test/canonical-icons.test.mjs`.

## Text/path pins
- `apps/app/src/prototype/template-source.ts:2` (only code importer; `?raw`).
- Host tests reading this half: `test/phone-adapter.test.mjs:137`, `test/photos-view.test.mjs:84-121` (slices `{{is.photos}}`…`{{is.maps}}`), `test/browser-reading-capability.test.mjs:29,107,145-157` (line-based filtering — keep those rows single-line), `test/scanned-calendar-handoff.test.mjs:239-241,311`, `test/home-shell.test.mjs:439-440`, `test/home-cards.test.mjs:101-103`, `test/accessibility-coverage.test.mjs:48-57` (≥25 `data-alpha-subview`), `test/canonical-icons.test.mjs:25`, `test/aosp-secure-camera-policy.test.mjs:59-62`, `test/gesture-zones-single-instance.test.mjs:28-30`, `test/theme-palette.test.mjs:10`, `test/product-identity.test.mjs:147`, `test/dc-lite-keys.test.mjs:66-67`, `test/files-browser.test.mjs:219` (part 2 slice).
- Other pins (51 files total name `template.html`): `test/fixtures/{shade-row-custody,voice-markup,workflow-clock-admission,workflow-execution-markup}.mjs`, `test/support/login-surfaces.mjs`, `test/browser/{browser-list-focus,canonical-notes-design,maps-list-focus,notes-photos-list-focus}.spec.ts`, plus ~20 more host tests.
- Formal: `specs/quint/application/manifest.json` (16 entries), `specs/quint/legacy/manifest.json` (1), refinement harnesses `specs/quint/refinement/application/{calendar-form-controls,calendar-preservation-confirmation,camera-preview-retirement,canonical-calendar-editor-close,dock-clearance-ownership,modal-scrim-ownership,modal-toast-forwarding,notes-recorder-media-admission,photos-owned-album-dialog,workflow-request-recovery-admission}.mjs`, `specs/quint/refinement/legacy/{calendar-navigation,camera-session}.mjs`.
- Scripts: `scripts/audit-production-bundle.ts:104` (raw-template matching).
- Docs: `apps/app/src/prototype/README.md`, `apps/app/src/browser/browser-surface.ts` (comment).

## New patterns
- NEW-T1 **"Hide by false flag" in the raw template**: production adapters set a prototype flag to a constant `false` (`isNews:false`, `hasPeople:false`, `notNative:false`, `homeShowDate:false`) so the matching `<sc-if>` never renders, but the markup is a `?raw` string and still ships. Treatment: move the region behind a `template-source.ts` marker (the mechanism exists), then delete the constant-false override. It is a template-level form of A5/A6.

## Owner questions
- Does the fixture-mode phone simulator (prototype Phone/Messages, canned Browser pages with the Nopa booking, calendar invites) keep existing for test-mocks/dev builds? If yes, it moves into a spliced development HTML file. If no, roughly 650 lines here, the model.js producers and about 10 dev browser specs are deleted.
- Keep the Photos in-app share sheet (2133-2160) for the browser build, or rely on native share everywhere?
- Should the global "Back to apps" fallback (line 26, hidden by `:has()` CSS when a header exists) replace the per-view header back buttons? That would leave one mechanism.
