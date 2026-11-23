# Chunk app-14-p2 — apps/app/src/prototype/model.js lines 2973-5944

Report: [`files/apps/app/src/prototype/model.js.part2.md`](../files/apps/app/src/prototype/model.js.part2.md)

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/model.js (2973-5944) | SPLIT + DELETE fixture-only parts | 2,972 | ≈1,700 (≈350 deleted, ≈900 moved to dev modules) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `ctGet`/`filesFind`/`walCard`/`walPass`/`wfFind` | helper | model.js:3357,3627,3870,3893,4265 | `notesFind` 2928, `calFind` 1164, `person` 113, `pnWho` 154, `inboxPerson` 802, `calPerson` 1166 | one `byId()` (or `Array.find`) |
| `notesUndoable`/`filesUndoable`/workflows `undo`/`stRemoveAcct` | helper | model.js:2974,3629,4446,4619 | `restoreById` model.js:132, `walRestoreCard` 3911 | `restoreById` + `undoToast()` |
| `notesShare`/`filesShare` | helper | model.js:3060,3644 | each other | one `shareTo()` |
| `ctIni` | helper | model.js:3352 | `initials()` contacts-adapter.ts, `callIni` model.js:5799 | `apps/app/src/lib/initials.ts` |
| regex escape inline | helper | model.js:3363 | 1 more copy in apps | `apps/app/src/lib/escape-regexp.ts` |
| `wfAmpm` | helper | model.js:4192 | alias of `formatHours` (locale-time) | delete |
| `wfDeferredRequest` | helper | model.js:4252 | `deferredMvpPrompt` mvp-features.ts:33 | dev simulator, reuse mvp-features |
| `stRow`/`stNav`/`stTog`/`stSeg` | helper | model.js:4611-4618 | settings-adapter.ts `info()/note()/group()` (~750), `api.track/kx` model.js:5418 | shared `settings-rows.js` |
| `stPlane` / tile `plane` toggle | helper | model.js:4624, 5784 | each other | one helper (dev) |
| `stUnscroll`/`stNoScroll` | helper | model.js:4630,4685 | each other | `resetStageScroll()` |
| `stEmailOk` | helper | model.js:4686 | email checks in calendar-form-inputs (`calendarGuestEmail`) | delete with add-account flow |
| `ST_TOP` | const | model.js:4609 | settings-adapter `categoryNames`/`labels` | delete (0 readers) |
| `WF_*` constants | const | model.js:4172-4189 | `browser/simulated-workflows.ts`, workflow-adapter operation names | simulated-workflows.ts |
| `FILES_FOLDERS`/`FILES_TYPES` | const | model.js:3613,3618 | upstream files-browser-adapter `ICON_KEYS`/type labels | dev simulator |
| checkbox/toggle inline styles | const strings | model.js:3246-3247,3285,4613,5418 | workflow-adapter.ts:463 cards | CSS classes |
| `api(k)` return shape | implicit type `ViewApi` | model.js:5390-5420 | `Bag`/`api: Bag` in ~45 adapters, upstream `ViewApi` | exported `ViewApi` type |
| view definition object | implicit type `ViewDefinition` | model.js:3074,3452,3655,3919,4328,4695 | upstream `ViewState` module type | exported `ViewDefinition` type |
| `BASE` | const | model.js:5167 | `HOME_DEFAULTS` (part 1) | shell module |
| `stPageFocus`/`stPageAccess` | const/helper | model.js:4633-4683 | — | `prototype/settings-page-focus.js` (exported) |
| `ctLetter`/`ctGroups` | helper | model.js:3406,3411 | — | `prototype/contacts-groups.js` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| Wallet module 3848-4159 + `WAL_*` fixtures, `secureAdmits` "wallet", `pUp` double-tap 5921, Wallet presets/app icon in WF_KINDS | registered only `if (testMocksEnabled)`; `mvp-features.ts:19` "Removed from MVP in both distributions"; PRD AP-13 | High (owner decision: "retained for restoration") |
| Heads-up banner: `showHeads`, `headsDone`, `heads*` render values 5910-5915, `n === "heads"` branch 5442, `heads` in BASE | template.html:4513 "No heads-up banner"; `headsOpen/headsReply/headsX/headsSw` 0 hits outside model.js; 5431 already maps "heads"→home | High |
| Unbound render values: notes `vo.actCount/empty/bars/toCal/calIcon/calLabel/calText`, `pinIcon/pinCss`, `lk.when`, `emptyMessage`; files `pv.saveSum/sum`, `fd.toggleSort/sortLabel`; settings `persona/openChar/scrollFix`; workflows `noop` | `grep "{{notes.vo.actCount"` etc. in template.html, development-rail.html, development-system-surfaces.html: 0; no adapter reads them (`out.persona` in settings-adapter.ts:737 is a dead write) | High |
| `NOTES_WAVE` (part 1, 2923) | only reader is `vo.bars` (unbound) | High |
| `ST_TOP` 4609 | `git grep ST_TOP`: definition only | High |
| Fixture agent `Component.reply/send/agentSay/cardAct/startVoice` + all view `reply:`/`actions:` (~390 lines) from the product file | agent-adapter.ts:1692,1925,1939,1952,2075 replace them without calling originals; only fixture mode reaches them | High (move to dev, not delete repo-wide) |
| Workflows model render/reply/actions/helpers (~390 lines) from the product file | workflow-adapter.ts:66,462 replace persist/reply/render; back/onLeave replaced at 461 | High (move to simulated-workflows) |
| Settings add-account flow with password field (5042-5082), test-mocks-only pages/sheets | every branch gated `testMocksEnabled`; settings-adapter forces `adding:false`, drops the sheets; AGENTS.md "Do not collect credentials" | High |
| Dev-rail values `jumps/subJumps/modes/legend/themes/toggleFs/notFs` + view `jumps:` arrays | bound only in development-rail.html | High (move) |
| `typeof pnFmt/pnRel/PN` guards, `VIEWS.inbox/messages/browser/notes &&` guards | all defined/registered unconditionally in the same module | High |
| try/catch around `api.setView`, `focus`, `setPointerCapture`, scroll resets | setView is setState; others cannot throw in supported browsers | Medium |
| `PLAN.md` references 3178, 3220 | file does not exist | High |

## Cross-file actions
- **Retire the fixture agent:** move `Component.reply/send/agentSay/cardAct/startVoice` and every view `reply`/`actions` to a dev module installed only in fixture mode; at the same time delete `view.reply=()=>null` / `suggestions=()=>[]` undo lines in `workflow-adapter.ts:66`, `contacts-adapter.ts:123-124`, `phone-adapter.ts:198`, `sms-adapter.ts:198` (+3 more per research P7); make agent-adapter's `send/reply/agentSay/cardAct/startVoice` the class methods. Files: `model.js`, `agent-adapter.ts`, `main.tsx`, the adapters above, `test/browser/mvp.spec.ts`, `dev-*.spec.ts`, `specs/quint/refinement/application/{surfaces,shell-core-fixture}.mjs`, `specs/quint/application/manifest.json` (`startVoice()` pin).
- **Wallet removal:** `model.js` (3848-4159, 4180, 4183, 5484, 5921), `fixtures.js`, `fixtures.empty.js`, `data-adapter.ts:30,65-69`, `native-adapter.ts:83,271`, `agent-adapter.ts:691-695`, `mvp-features.ts:17-19,30`, `browser/apps.ts:8,10`, `browser/simulated-apps.ts:34`, `template.html:3231-3526`, `test/browser/dev-wallet.spec.ts`, `test/wallet-disabled.test.mjs`, `test/home-views-model.test.mjs:163` (wallet slice and `walRestoreCard`).
- **Heads-up removal:** `model.js`, `development-rail.html` (`fireHeads`), `agent-adapter.ts:1538` (`headsOk`), `fixtures.js` (`HEADS`, `LOCK_SUM`), `test/home-cards.test.mjs:103`, `specs/quint/refinement/application/shell-core-fixture.mjs`.
- **Workflows simulator move:** `model.js` 4161-4574 → `browser/simulated-workflows.ts`; `browser/simulated-apps.ts:30`, `automations-adapter.ts:43`, `clock-adapter.ts:11,86` wrap `views.workflows.render` and must still find a function (keep a stub render returning `{}` in the product view); `test/fixtures/workflow-clock-admission.mjs`, `dev-workflow-*.spec.ts`.
- **Settings split:** `model.js` 4590-5165 and `settings-adapter.ts:729-1265` — the adapter pins top-row labels ("Accounts", "Connections", "Models", "Privacy & data", "Set up Alpha access", "Display", "Notifications", "About") and removes `out.persona`; move test-mocks pages into a dev settings module; share `stRow/stNav/stTog/stSeg` with the adapter's `info/note/group`. Pins: `test/final-ui-lifecycle.test.mjs:7`, `specs/quint/refinement/application/settings-page-focus.mjs`, `specs/quint/legacy/settings-nav/check-settings-nav-refinement.mjs`, `test/home-views-model.test.mjs` (`stDownloadModel`), `test/hosted-digest-panel.test.mjs` (`stTog`), `manifest.json` `latchPatch(api && api.st, ["busy"])`.
- **Files scaffold vs upstream adapter:** `model.js` 3600-3846, `selection-adapter.ts:220-238`, `.eliza/client-features/plugins/plugin-files/src/browser/files-browser-adapter.ts:1132+` (upstream — change upstream first), `data-adapter.ts:48-49` (`storageText/storageW`), `context-selection.ts`/`native-adapter.ts` (`askSearch`), `test/files-browser.test.mjs`, `specs/quint/legacy/files-browser`.
- **Notes legacy branches:** delete `api.moveNoteToTrash`/`api.notesFolders` branches together with `notes-trash-adapter.ts:187`, `notes-folders-adapter.ts:50`, `canonical-notes-ui.ts:320,346` (`legacy` source option), `agent-adapter.ts:363,546-580` (`notesSourceMode==='legacy'`), `legacy-notes-access.ts` (research P10).
- **Dev rail values:** `model.js` 5817-5835, 5928-5935, view `jumps:` arrays, `development-rail.html`, `template-source.ts` (splice point).
- **Shared helpers:** `byId`, `restoreById`/`undoToast`, `escapeRegExp`, `initials` — `model.js` (parts 1 and 2), `contacts-adapter.ts`, the other regex-escape copy in apps.
- **IC self-defaults:** fold 38 `IC.x = IC.x || …` (83 file-wide) into the `IC` literal (model.js:29) or `apps/app/src/icon-catalog.json`; `ICON_ASSETS` 5943 and `dc-lite.js:139-141` depend on final `IC` values; `test/canonical-icons.test.mjs`.

## Text/path pins
- `test/home-views-model.test.mjs` — `readFileSync` of model.js; slices `registerView("notes"`…`registerView("contacts"`, `registerView("wallet"`…`registerView("workflows"`, `function notesFind(`…`function notesUndoable(`, `'\n  render: function'`, ordering of `this.secureAdmits(` vs `opts.keepState && VIEWS[k]`; names `ctGroups`, `ctLetter`, `walRestoreCard`, `stDownloadModel`, `resetViewGlobals`, `everyBg/laterBg/stopBg`, `homeHint`.
- `test/final-ui-lifecycle.test.mjs:7` — `between(s,'var stPageFocus =','/* the prototype page')`.
- `test/notes-empty-close.test.mjs` — `registerView("notes"`, `notesNew`.
- `test/chat-transcript-window.test.mjs`, `test/restored-history-limits.test.mjs`, `test/checkin-choice-presentation.test.mjs` — `transcriptWindow`, `growChatWindow`, `getSnapshotBeforeUpdate`, `CHAT_CLOSED_ROWS`.
- `test/toast-undo-offer.test.mjs` — toast queue source text.
- `test/hosted-digest-panel.test.mjs` — `stTog`.
- `test/home-cards.test.mjs` — `showHeads` absence assertion.
- `specs/quint/application/manifest.json` — symbol pins on model.js: `toastQueue`, `closeToast`, `scheduleToast`, `back()`, `shellNavigate`, `closeAssistant`, `stopVoice`, `swallowed()`, `openSheet`, `toInput`, `rest()`, `runBoot`, `unlock()`, `power()`, `secureAdmits`, `openView(k, patch, chat, opts)`, `secureAdmits(secure, k)`, `keepState`, `keepStack`, `goHome(chat)`, `startVoice()`, `stopVoice()`, `leave()`, `openSystemShade`, `simulatedShade`, `latchPatch(api && api.st, ["running"])`, `latchPatch(api && api.st, ["busy"])`, `vreset(k, p)`, `everyBg`, `laterBg`, `getSnapshotBeforeUpdate`, `followVoiceTurn`.
- `specs/quint/refinement/application/{settings-page-focus,voice-transcript-follow,shell-core-fixture,surfaces,accessible-toast-lifetime}.mjs`, `specs/quint/application/VoiceTranscriptFollow.qnt`, `specs/quint/legacy/{settings-nav,files-browser,chat-input}/check-*-refinement.mjs`.
- `test/support/feature-parity.mjs:35,388` — model.js named as owner path.
- `settings-adapter.ts:1158-1199` — Settings top-row label strings produced by model.js 4847-4874.
- 86 files in test/specs/scripts mention `model.js` overall; ~35 Playwright specs.

## New patterns
- NEW-1 **Simulated credential / consent flows in fixture code**: the test-mocks Settings add-account flow collects an email and password and shows a fake OAuth consent page ("Alpha wants to access your … account"); the Wallet add-card flow collects card number/expiry/CVV and auto-fills a fake verification code. Even dev-only, AGENTS.md says "Do not collect credentials". Treatment: delete the input fields; a dev fixture that needs an account should seed one directly.
- NEW-2 **Unbound render values** (close to A7 but inside an object literal): keys returned from `render`/`renderVals` that no template, rail or adapter reads (≈20 in this part). Detectable mechanically by diffing returned keys against `{{view.key}}` bindings; worth a one-off script across all views.
- NEW-3 **Fabricated success copy in simulators** (`wfRunLog` "Nothing unusual", "Spoke it aloud (32 s)", files `transcribe` inventing a "Landlord" transcript, notes `toCal` "added to Calendar" without a write). Close to A5/A6; flag so moved dev code does not leak into production copy audits.

## Owner questions
1. Wallet (AP-13): delete the model, template, fixtures, simulator and dev tests now, or keep "retained for restoration"?
2. Does the fixture-mode simulator (`?fixture=1` / mock mode) remain a supported developer surface? If yes, the fixture agent, view replies, workflows/settings/files simulators move to `apps/app/src/dev/`; if no, ≈900 more lines and their dev specs are deleted.
3. Is the legacy "previous notes" source retired (A1)? That removes the `moveNoteToTrash`/`notesFolders` branches in every Notes mutator.
4. Settings `character` page and `charName` rename: dev-surfaces only (`settingsPage`) — keep as a developer surface or delete?
5. Files: which `out.*` keys of the model's files render does the upstream `files-browser-adapter` rely on? The contract is untyped; needs the plugin owner before trimming the scaffold.
