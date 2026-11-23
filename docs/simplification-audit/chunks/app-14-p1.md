# Chunk app-14-p1 — apps/app/src/prototype/model.js lines 1-2972

Report: `docs/simplification-audit/files/apps/app/src/prototype/model.js.part1.md` (part 2 is a separate chunk).

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/model.js (1-2972) | SPLIT + move/delete fixture-only view code | 2,972 | ~1,250 product lines (simulator moved out) / ~1,150 (simulator retired) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `IC` | const | model.js:29 (+45 `IC.x=IC.x||` lines) | `icon-catalog.json`, `ICON_ASSETS` model.js:5943; duplicate paths `user/brUser`, `send/wfUp`, `mapsBus·Cup·Food·Gym/wal*`, `filesDown/stDownload` | `prototype/icons.js` keyed by name |
| `DAYS`, `MONS` | alias | model.js:97-98 | `WEEKDAYS`/`MONTHS` locale-time.ts:12-13 | delete |
| `person`, `pnWho`, `msgWho`, `inboxPerson`, `calPerson`, `phPersonWord` | helper | 113, 154, 494, 802, 1166, 2117 | each other; `api.person` (part 2) | shell `personById` |
| `pnPeople`, `msgPeople`, `inboxPeople`, `calPeople` | helper | 153, 493, 801, 1165 | msg≡inbox identical | shell `people(api)` |
| `pnFirst`, `msgFirst`, `phFirst` | helper | 162, 506, 2116 | ~35 inline `.name.split(" ")[0]` | shell `firstName` |
| `pnClock`, `camRecLabel`, `notesFmt` | helper | 186, 1929, 2926 (+inline 1926) | each other | `lib/format.clockMinSec` |
| `pnRel` inner `day()`, `phAgo`, month-grid offset | helper | 177, 2108, 1439 | `Date.UTC` civil-day twins in 10 files (research P13) | `prototype/util/dates` |
| `inboxClock`, `mapsClock`, `phTime`, `notesNowLabel` | alias | 813, 2573, 2114, 2927 | `formatTime` | delete |
| `calFind`, `notesFind`, `inboxMail` | helper | 1164, 2928, 815 | each other | shell `findById` |
| `pad2` | helper | 115 | `padStart(2,"0")` in locale-time.ts and runtime | `lib/format` |
| `pnDigits`, `pnFmt` | helper | 155-160 | phone normalisers in `phone-adapter.ts`/`contacts-adapter.ts` (verify) | `lib/phone` |
| `latchPatch`, `restoreById` | helper | 125, 132 | `notesUndoable`, `phRestore`, part-2 `walRestoreCard` | shell helpers |
| `CAL_PENDING`, `PN`, `PH_T`, `MAPS_DRAG`, `NT` | mutable global | 1143, 150, 2196, 2548, 2924 | part-2 `resetViewGlobals` | per-shell state |
| `CAL_H0/H1/PX`, frame width `412` | const | 1144, 1395, 1633, 2790 | `calendar-days.ts`, part-2 shell geometry | one `FRAME_W` / calendar-days |
| English weekday lists | const | 1186, 2122 | `WEEKDAYS` | simulator |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `LOCK_SUM` import (14) | 1 hit in model.js (the import) | Confirmed |
| `HEADS` import + heads-up code | only read by dead `heads*` (5911-5914), no template binding | Confirmed (with part 2) |
| IC keys `brTabs brUser camScan phSelect notesRecDot mapsStraight inboxFwd` | git grep: 0 uses beyond definition in apps/test/scripts/fixtures | Confirmed (catalog + canonical-icons test must change) |
| 45 `IC.x = IC.x ||` self-defaults | single module, defined once | Confirmed |
| `CONTRACT.md` comment (119), `#411` comments (1018, 2956) | file does not exist | Confirmed |
| `clearKey` (449), `noop` (1575) output fields | template 0, adapters 0, tests 0 | Confirmed |
| dead locals `joinNext` ternary (699-700), `nm` (395), `loc` (1097), `total` (2634), unused params `pnIni num`, `calMatch api` | read in place | Confirmed |
| `api.now==null` (1497-1498), `(api&&api.st)||{}` (1720), `(api.S&&api.S.stack)||[]` (2176), `BR_START||{}`, `MAPS_SAVED||{}` | api.now always set; fixtures.empty exports `{}` | Confirmed |
| 8 `reply:` responders + `scriptedReply` (~350 lines) | `agent-adapter.ts:1939` replaces `Component.reply`; no adapter installed in fixture mode | Confirmed unreachable in production; delete vs move = owner |
| fixture `actions:` (except camera.scan) | `native-adapter.ts:395` replaces all with "Unavailable" | Confirmed unreachable in production |
| Phone/Messages render + `pn*`/`msg*` simulation | not MVP outside AOSP image; image replaces render (`phone-adapter.ts:201`, `sms-adapter.ts:246`) | Confirmed dev-profile only |
| Inbox render + helpers (972-1128, 785-854) | `inbox-cloud-adapter.ts:855` replaces render whenever `!browserDevProfile` | Confirmed dev-profile only |
| Maps render + SF geometry (2524-2911) | `maps-adapter.ts:182` replaces render (`main.tsx:126`) | Confirmed dev-profile only |
| Test-mocks Browser view (1585-1888) | registered only `if (testMocksEnabled)` | Confirmed; move to simulator |
| `mockAttentionRows` shim `mock-attention.ts` | single importer `data-adapter.ts:2` already imports model.js | Confirmed |
| Calendar stub reminder fields (1475) | overwritten by `reminder-adapter.ts:166` | Likely |

## Cross-file actions
1. **IC cleanup**: model.js (IC literal + 45 extensions + 7 unused keys), `apps/app/src/icon-catalog.json`, `test/canonical-icons.test.mjs:17-21` (regex for `IC.x = IC.x ||` and count 148), `scripts/vendor-lucide-icons.ts`, `apps/app/public/icons/lucide/*` (only if an SVG loses its last key), `apps/app/src/icon-style.ts`.
2. **Fixture-only view code move/delete** (Phone, Messages, Inbox, Maps renders; all `reply:`; fixture `actions:`; Browser test-mocks view): model.js; new `apps/app/src/browser/simulated-{phone,messages,inbox,maps,browser}.ts`; `main.tsx` (dev-profile install); remove undo layers `phone-adapter.ts:198`, `sms-adapter.ts` reply null, `inbox-cloud-adapter.ts:58-59`, `maps-adapter.ts:180`, `browser-adapter.ts:418,424`, `native-adapter.ts:395`; tests `test/home-views-model.test.mjs`, `test/browser/dev-*.spec.ts`, `mvp.spec.ts`, Quint `specs/quint/application/manifest.json` + `refinement/application/surfaces.mjs` + README (pn* pins).
3. **Render side effects → `incoming` hook** (phone deep link, calendar `st.add`, browser `st.url`, maps address): model.js, part-2 `Component` (`incoming` dispatch), `home-views-model.test.mjs:289` (`CAL_PENDING`, `PN` var pins), Quint manifest (`PN.boot`).
4. **Module globals → per-shell state** (`PN`, `CAL_PENDING`, `PH_T`, `MAPS_DRAG`, `NT`): model.js part 1 + part 2 `resetViewGlobals`, `home-views-model.test.mjs`, `notes-empty-close.test.mjs`.
5. **People/time/find helpers consolidation**: model.js parts 1 and 2 (contacts/files/settings use the same patterns), `locale-time.ts`, any new `prototype/util/` module; `DAYS/MONS` removal touches `home-views-model.test.mjs` load lists.
6. **`mock-attention.ts` shim**: delete file, edit `data-adapter.ts:2`, `test/support/feature-parity.mjs:387`.
7. **Split into `prototype/views/*.js`**: blocked on converting `top(name)`/`method(name)` text slicing in `test/home-views-model.test.mjs` and the 32 `readFileSync(model.js)` host tests to imports (T2), and on re-pointing Quint manifest `path` entries.

## Text/path pins
- `test/home-views-model.test.mjs`: slices top-level `function`/`var` declarations by name (`pnScript pnDigits pnFmt pnCallId pnWant pnStart pnEnd latchPatch restoreById inboxUndo calDate calDayName camModeEndsRec camStopRec mapsAddr mapsLen mapsSteps mapsStreet mapsVia MAPS_H MAPS_V MAPS_STREETS notesAway notesStopTimers DAYS MONS IC`); `:289` requires `\nvar PN = `, `PH_T`, `NT`, `CAL_PENDING`.
- `test/canonical-icons.test.mjs:17-21`: `var IC = {` … `\n};` slice, `IC.x = IC.x || "…";` regex, 148-key count.
- `test/notes-empty-close.test.mjs` (`notesUpd`, `notesClose`, `NT`); `test/native-popover-back.test.mjs`, `test/quint-back-dispatch.test.mjs` (`notesLeave`); `test/quint-fixture-busy-latch.test.mjs` (`latchPatch`).
- `specs/quint/application/manifest.json`: literal strings `function latchPatch(st, keys)`, `function pnCallId|pnWant|pnStart|pnEnd|pnRingEnd|pnDecline`, `PN.boot`, `PN.live`, `callWho`, `latchPatch(st, ["ag"])`, `latchPatch(st, ["typing"])`; `specs/quint/refinement/application/surfaces.mjs`; `specs/quint/application/README.md`.
- `test/support/feature-parity.mjs:388` (path); 80 files under test/specs/scripts reference `model.js`, 32 host tests read its text (list in the per-file report and part 2).

## New patterns
- **NEW-a: Fixture identities baked into model logic** — regexes and branches keyed on fixture people/places/companies (`jordan|northpoint` 1271, `"sfo"` 2753, `"nopa"` 1817, `dad/father` 2117, `NP-` 1679, `meet.lumen.example/` 1544 in a live save path). Treatment: fixture literals live only in `fixtures.js`/simulators; product code never names fixture data.
- **NEW-b: Identical-branch ternaries** (`joinNext ? X : X`, 700) — leftovers of removed styling; delete branch and its predicate.
- (Confirms research P17 as a catalogue gap: "render starts side effects" — 4 instances here; suggest adding it as D-pattern.)

## Owner questions
1. Does the fixture/dev-profile simulator (Phone, Messages, Inbox, Maps renders, 8 canned `reply:` responders, test-mocks Browser booking agent) remain a product requirement? If not, ~1,700 lines of this range and the dev-*.spec suites that drive them are deleted; if yes, they move to `browser/simulated-*.ts`.
2. The Quint application manifest pins `pnStart/pnEnd/pnRingEnd/pnDecline/pnCallId/pnWant` — phone call simulation that only runs in the dev profile. Keep these refinement checks (and the model) once the code moves to the simulator, or retire them?
3. Calendar form `save` (1539-1549) fabricates a `meet.lumen.example/<slug>` video link for new events with Video on. `agent-calendar-adapter.ts:286` and `calendar-adapter.ts:276` replace `save` in their scopes — is there any production calendar source where the model `save` still runs? If yes, the fabricated link must go.
4. Are the `try { api.set } catch` "could not be restored/deleted" toasts (403-404, 665-673) a specified storage-failure behaviour, or can `api.set` be treated as non-throwing?
