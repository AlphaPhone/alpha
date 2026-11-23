# Chunk app-18-p2 — apps/app/src/prototype/template.html lines 2297-4593

Report: [`files/apps/app/src/prototype/template.html.part2.md`](../files/apps/app/src/prototype/template.html.part2.md)

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/template.html (2297-4593) | SIMPLIFY | 2,297 | ≈1,650 (≈300 deleted, ≈300 moved to development HTML, ≈50 deduplicated) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| Switch track/knob | markup | template.html:3302,3309,3575,3642,3992,4091,4096 | template.html:1293 (part 1) | `.switch` class, phone.css |
| Note action menu | markup | template.html:2500,2589,2618 | each other | one block from `notes.detail` |
| Note detail header | markup | template.html:2468,2515,2604 | each other | same |
| Note row | markup | template.html:2442,2452 | each other | one `sc-for` |
| Maps place row | markup | template.html:2319,2326 | each other | one list |
| Draft-status notice | markup | template.html:4266,4459 | each other | shared block / `.draft-notice` |
| Compose context bar | markup | template.html:4440,4460 | each other | shared block |
| Composer Stop/Send/Talk | markup | template.html:4446-4449,4465-4468,4479-4480 | each other | shared block |
| Stop-square SVG rect | const | template.html:4447,4466,4479 | none in `IC` | `IC.stopSquare` |
| Thinking skeleton | markup | template.html:2549,3084 | template.html:194-197 | `.alpha-skeleton` |
| Italic compute-mark wrapper | style | template.html:2337,2404,2806,2854,3758,3769,3861,4048,4464,4477,4498,4547 | part 1 | `.alpha-mark-inline` |
| Bottom-sheet scaffold/grabber | markup/style | template.html:2654,2668,3163,3181,3869,4198 | part 1 (1589,1656,2073,2137,2178) | `.sheet*` classes |
| Lucide mask inline style | style | template.html:4003,4063,4075,4537 | `.mail-toolbar-icon` 4434,4484; part 1 #16 | `.lucide-icon` |
| Files 44px icon tile | style | template.html:2924,2941,2949,2956,2997,3169 | — | `.file-row-icon` |
| Approve/deny button pair | markup | template.html:3735,3747 | each other | shared classes |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `r.kCalendarDisplay` settings row (4096) | `git grep kCalendarDisplay` and `.eliza/client-features` grep: only this line | High |
| Wallet view (3231-3524, 294 lines) | PRD AP-13; `mvp-features.ts:17,23`; producers only model.js `:3848-4160` | Owner decision |
| Home date line inside shade (4522) | constant false in `data-adapter.ts:203-206` (part 1 #8) | High |
| Tombstone comments 3186, 4513 | A8 | High |
| Legacy-notes controls (2415, 2425, 2461; unwrap 2424) | `canonical-notes-ui.ts:299,347-352`; research P10 | Owner decision |
| Move to dev HTML: stand-in shade 4515-4561 | `simulatedShade` = devSurfacesEnabled (`model.js:5546`, `main.tsx:113`) | High |
| Move: fixture voice panel 4493-4510, spacer 4452 | `voice !== 'off'` only from model.js startVoice, replaced by `voice-adapter.ts:924` when `!fixture` | High |
| Move: canned chat cards agenda/event/note/flow/summary/draft/call (4316-4331, 4344-4400) | `card.type` values produced only by model.js reply responders | High |
| Move: Contacts prototype header/search/no-hits/ask/fav/delete (2727-2742, 2795-2809, 2818, 2820) | `contacts-adapter.ts:131,133` forces them false | High |
| Move: Settings consent page / scopes / password sheet (4032-4042, 4208-4217) | model.js only (`:5069,5117`); `native-adapter.ts:280` neutralises `onPw` | High |
| Move: Workflows History controls (3545, 3689) | only `browser/simulated-workflows.ts` produces them | High |
| Move: Files receipt/audio/archive/sun (3122-3155) | `selection-adapter.ts:177-178` forces false; upstream does not produce | Medium (probe) |
| Move: Files Move/Share sheets (3161-3194) | upstream adapter replaces handlers with native ops | Medium (probe) |
| Move: Contacts prototype editor + favourites (2864-2896, 2774-2783) | model.js only producers; not proven unreachable | Medium (probe) |

## Cross-file actions
1. **Wallet removal:** template.html 3231-3524; `model.js:3848-4160,5484,5921`; `fixtures.js` / `fixtures.empty.js` `WAL_*`; `data-adapter.ts:30,65-69`; `native-adapter.ts:83,271`; `agent-adapter.ts:691-695`; `mvp-features.ts:17,23,30`; `browser/apps.ts:8,10`; `browser/simulated-apps.ts:34`; `test/browser/dev-wallet.spec.ts`; `test/wallet-disabled.test.mjs`; `test/files-browser.test.mjs:219` (slice end anchor).
2. **Dev-region splice:** template.html (replace regions with marker comments); `template-source.ts` (add `.replace` per marker, or one new `development-views.html`); `development-system-surfaces.html` (shade); `test/gesture-zones-single-instance.test.mjs:28-30`; `specs/quint/application/manifest.json` (`simulatedShade` entry :8617); `scripts/audit-production-bundle.ts` (add absence assertions).
3. **Undo-layer removal after the move:** `contacts-adapter.ts:131,133` (`nativePrototype/hasQ/noHits/notSearching/searching=false`); `selection-adapter.ts:177-178` (`isReceipt/isAudio/isArchive/photoSun`); `native-adapter.ts:280` (`onPw`/account-add arm); later `data-adapter.ts:242-246` `voiceOn` guards with model voice retirement.
4. **Legacy notes (P10):** template.html 2415, 2424-2425, 2461; `canonical-notes-ui.ts:299,347-352`; `agent-adapter.ts:2088-2093`; `legacy-notes-access.ts`; `test/notes-view-defaults.test.mjs`.
5. **Notes detail dedup:** template.html 2466-2628; `model.js` notes render (`ed`/`vo`/`lk` at `:3337`); `canonical-notes-ui.ts`; `subview-accessibility.ts`; keep `data-agent-id` values used by `agent-adapter.ts`.
6. **Composer dedup:** template.html 4439-4468, 4479; `test/fixtures/voice-markup.mjs` slice anchors; `test/voice-assistant.test.mjs:773`; `test/chat-stop-controls.test.mjs`; `specs/quint/refinement/application/dock-clearance-ownership.mjs`.
7. **CSS classes:** template.html (switch, sheet, skeleton, mark, lucide, file tile) + `phone.css`; coordinate with part 1 #14-#17 and the `development-*.html` files.
8. **`sc-if test` fix:** template.html 4310 only; verify with `test/calendar-approval-ui.test.mjs` (add a DOM assertion that the Calendar button appears when `canOpen`).

## Text/path pins
- `test/files-browser.test.mjs:219` (slice `{{is.files}}`…`{{is.wallet}}`)
- `test/notes-recorder-controls.test.mjs:9,52,56` (slice to literal `\n</div>\n</div>\n</sc-if>`, regex Record voice note)
- `test/fixtures/workflow-clock-admission.mjs:15,54-55`; `test/fixtures/workflow-execution-markup.mjs:6` (slice runOpen…builder); `test/automations-unified.test.mjs:129-132`
- `test/fixtures/voice-markup.mjs:8-10` (slices around `alpha-chat-notices`, `legacyChatRecorder`, `inlineChatRecorder`, `panelComposer`)
- `test/voice-assistant.test.mjs:772-774`; `test/voice-in-chat-only.test.mjs:25-29`; `test/chat-stop-controls.test.mjs:8,24`; `test/chat-transcript-window.test.mjs:23`; `test/fixtures/shade-row-custody.mjs:9`
- `test/gesture-zones-single-instance.test.mjs:28-30` (shade regex); `test/home-cards.test.mjs:103`; `test/accessibility-coverage.test.mjs:48-57` (≥25 subviews); `test/assistant-settlement-delivery.test.mjs:166-171`; `test/calendar-settings-simplicity.test.mjs:23`
- `specs/quint/application/manifest.json` (16 `template.html` entries); refinement harnesses `modal-toast-forwarding.mjs:153`, `dock-clearance-ownership.mjs:151`, `modal-scrim-ownership.mjs`, `email-suggestion-review.mjs`, `photos-owned-album-dialog.mjs`, `calendar-form-controls.mjs`
- `apps/app/src/prototype/template-source.ts` (marker strings `<!-- alpha-development-system-surfaces -->`, `<!-- alpha-development-rail -->`)
- `scripts/audit-production-bundle.ts` (bundle scan)

## New patterns
- **NEW-TPL-ATTR — template attribute the engine ignores.** `<sc-if test=…>` (4310): dc-lite reads only `value`, so the guarded control silently never renders. Treatment: fix; add a dc-lite dev-mode warning (or a build check) for unknown attributes on `sc-if`/`sc-for`.
- **NEW-COPY-NAME — hard-coded product name where the renamable agent name is bound elsewhere** ("Ask Alpha", 2545, 3080 vs `Ask {{name}}`). Treatment: bind `{{name}}`.
- Credential-entry fixture markup (Wallet card/CVV, account password, Wi-Fi password) shipping in production raw templates is a specific, high-priority instance of A3/A5 given AGENTS.md "Do not collect credentials".

## Owner questions
1. Delete Wallet (template 3231-3524 and all its model/fixture/test code) now, or keep it "for restoration"?
2. Fix `<sc-if test="{{review.canOpen}}">` → `value=` so the "Calendar" button appears after a succeeded Calendar request? (It has never rendered.)
3. Does the fixture-mode simulator (`?fixture=1`, `?mode=dev`) keep existing? If not, the canned chat cards, fixture voice panel, prototype Contacts, Settings consent/password sheets and Files fixtures can be deleted outright instead of moved.
4. Retire the legacy "Previous notes" source (2415, 2424-2425, 2461) per research P10?
5. Should "Ask Alpha" follow the user-chosen agent name (`{{name}}`)?
