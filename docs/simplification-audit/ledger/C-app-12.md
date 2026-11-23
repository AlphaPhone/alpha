# C-app-12 ledger (stage C, in-file cleanup of chunk app-12)

All 13 files of `chunks/app-12.files.txt` still exist. Stage A had already removed the folder-context half of
`context-selection.ts`, the tree kind and unused helpers of `files-index.ts`, the Wallet rows/seeds, the
dc-lite Notes special cases and `views.contacts.reply=()=>null` (A3). The items below are this unit's changes only.

## Done
- `contacts-adapter.ts`: removed the `setApi` setter and the shadowing `const api=viewApi` (NEW-1); the render
  assigns the closure `api` and uses `viewApi` inside the body. Un-exported `contactActs` (A7, no importer). The
  mail SVG path written twice is one `MAIL` constant next to `PHONE`/`BUBBLE` (C6; same path, no visual change).
- `context-selection.ts`: `sessionMarker` uses `randomHex(6)` from `lib/hash.ts` (B1 map R2, identical output;
  imported with a `.ts` extension because node tests import this file directly). Deleted `MIME_TYPE` and the
  self-validation in `locationMimeTypes` (B3: it validated its own literals; same results).
- `data-adapter.ts`: deleted the `installed` WeakSet guard (B4; one call site, `main.tsx`); dropped the
  `typeof this.overdueReminders === 'function'` guard (B2; reminder adapter is installed earlier in the same
  branch) but kept the try/catch fallback; `this.refreshAgentCalendar?.()` → direct call (B2; calendar adapter
  always installs it first); `mockAttentionRows` imported from `./model.js` instead of the `mock-attention.ts`
  shim (D4); the `'alpha.appearance.v1'` literal replaced by `APPEARANCE_KEY` from `settings-adapter.ts` (C6,
  same string); dropped the unread `homeCalendarPeople` default from `NEUTRAL_HOME` (A7); removed the unused
  `formatFullDate` import.
- `dc-lite.js`: the 17-branch attribute-rename `else if` chain and `EVENTS` are one `ATTRIBUTES` lookup table
  (D9; same mapping, same truthy-lookup semantics); header comment names `template.html` (A8).
- `file-email-review.ts`: local `SelectedFile` replaced by `import type { SelectedFile }` from
  `native/alpha-mail-attachments` (B2 map / types.md §1.1; identical shape).
- `files-index.ts`: un-exported `filesOpenKey` (A7; no importer; key string unchanged).
- `fixtures.js` / `fixtures.empty.js`: deleted `LOCK_SUM` (A7, imported but never used) and the one-line import
  fix in `model.js` (import list only). `fixtures.empty.js` header no longer cites the non-existent
  `test/fixtures-parity.test.mjs` (A8).
- `home-cards.ts`: deleted the aliases with no product importer: types `CalendarCardState`, `HomeAgenda`; values
  `briefOutcome`, `presentHomeNext`, `homeAgendaHeader`, `calendarCardState`, `presentHomeCalendar`,
  `attendeeInitials` (A7/T5) and their now-unused upstream imports. `homeCalendarValues` no longer writes the
  unread keys `homeCalendarPeople` and `homeCalendarItemDescription` (A7; no reader in apps/template).
- `home-overview-cards.ts`: `homeAttentionCard` drops the re-check of `homeInboxRows` after the guard and the
  dead `rows.length ? … : …` fallbacks (B4; rows are always non-empty there); `homeBriefCard` drops the
  always-true `retained` and its dead ternary sides (B4). Rendered output unchanged for every reachable input.
- `home-shell.ts`: deleted the reference to the non-existent "view refresh PLAN section 5" (A8).
- Tests (behavioural, kept working): `test/home-cards.test.mjs` — deleted the cases that only exercised the
  deleted aliases (`calendarCardState`, `presentHomeCalendar`, `attendeeInitials`, `briefOutcome`,
  `homeAgendaHeader`, `presentHomeNext`); the template/source assertions in the same blocks stay (two test titles
  renamed to what they still check). `test/home-overview-cards.test.mjs` — expected `homeCalendarValues` output
  no longer lists the two deleted keys.

## Deleted tests and formal artefacts
None deleted as files. Cases removed inside `test/home-cards.test.mjs` (feature = deleted test-only aliases).

## Pins left broken
None caused by this unit. Observed while verifying (not caused here):
- `test/quint-files-recent-index.test.mjs` fails (`index.revokeTree is not a function`): A3 removed the tree
  kind; `FilesRecentIndex.qnt` / `files-recent-index.mjs` need the port (already in A3's ledger).
- `test/quint-back-dispatch.test.mjs` fails slicing `function updateBackAvailability(` in `agent-adapter.ts`
  (owned by another unit; not touched here).
- `context-selection.ts` lost one `//@ skip` (with `MIME_TYPE`): the `skips` trust count in the
  `check-lemma.ts` receipt drops by one; the regenerated `context-selection.dfy.gen` is byte-identical.

## Skipped
- `data-adapter.ts` `empty` table and phone/messages/inbox wraps: Open Q-DEV-7. `fixtures.empty.js` removal:
  same. Real-business names in `fixtures.js`: Open Q-DEV-8. Contacts `IC.phone`/`IC.mail` glyphs: Open Q-UI-15
  (visible). Home badge allow-list (`home-shell.ts`): Open Q-UI-16. `phone-context.ts` folder kind: Q-UI-24.
- `installHomeCardVisibility` + `homeShow*` checks + template `home-date-line` blocks; `installContextSelection`
  deletion; `notifyHomeSourcesChanged`; `HOME_EDIT_CSS` → `phone.css`; `homePeopleVisibility` → per-card key
  (NEW-2): each needs edits in `main.tsx`, `agent-adapter.ts`, `template.html` or `phone.css` (other owners),
  and the last changes fixture-mode output.
- `contacts-adapter.ts` typed `alphaContacts` (B2 map): results become `unknown` and must be parsed; the map
  flags `more` vs upstream `next` — behaviour risk; test stubs pin `../platform-plugins`. Left local.
- `?.` on prototype lifecycle originals (`mount?.call`, `unmount?.apply`, `back?.apply`, `this.props?.…`,
  `tile.isConnected !== false`) in contacts-adapter/data-adapter/home-shell: the behavioural tests and Quint
  harnesses install onto shell classes without these members, so the guards are reachable there.
- `data-adapter.ts` `openView` try/catch: pinned and specified by `test/browser-calendar-open-source.test.mjs`
  ("Calendar still opens when its current source or retry cannot be read").
- `home-overview-cards.ts` `maskIcon` → `iconStyle` (adds display/size; visual), `typeof out.goX === 'function'`
  checks (writers differ per build), `INBOX_STATES` upstream import: left.
- `home-cards.ts` rename layer (`presentHome*` → one bound object; D4): touches 6 importers, a script, a
  browser spec's in-page import and HomeSurface symbol pins. `createStorageAccessCheck` move: stage F.
- `file-email-review.ts` rebuild on `openReview`: changes focus/inert/region behaviour (Q-UI-5 analogue).
- `dc-lite.js` files `aria-label` special case (needs template edit), icon-by-name, style parser: left.
- `HEADS` fixture + dev-rail "Incoming text" button: `model.js` heads code (other owner) still reads `HEADS`.
- All MOVE findings (dev HTML, fixtures, files-index, home-cards): stage F.
- `mock-attention.ts` itself (owned by chunk app-13): now has no importer in apps; its owner can delete it.

## Verification
- `npx tsc --noEmit`: no errors in owned files (14 lines of errors, all in other units' calendar files).
- `node --test` (tap reporter), each file: agent-always-local 9/9, automations-unified 45/45,
  browser-calendar-open-source 4/4, browser-reading-capability 7/7, chat-transcript-window 5/5, comms-settings 5/5,
  contacts-adapter 16/16, context-selection 9/9, dc-lite-keys 2/2, dev-surface-gates 8/8, final-ui-lifecycle 16/16,
  history-initial-state 11/11, home-cards 17/17, home-overview-cards 7/7 (after the expectation update),
  home-shell 12/12, native-adapter-activity 3/3, product-identity 8/8, quint-contacts-session 1/1,
  quint-home-surface 1/1, quint-own-notice-question 2/2, quint-drawer-interaction 1/1,
  quint-home-failure-notice 1/1, quint-home-gesture 1/1, reset-wiring 2/2, scan-* (6 files) all pass,
  selection-ask-readiness 5/5, template-style-cache 2/2. Failing, not caused here: quint-back-dispatch (0/1),
  quint-files-recent-index (0/3) — see Pins.
- LemmaScript: `lsc extract` and `lsc gen --backend=dafny` for `context-selection.ts`; generated `.dfy.gen`
  identical to the committed one. Dafny itself and the full `npm run lemma:check` were not run.
- Not run: `npm run --ignore-scripts build`, `npm run audit:bundle`, Playwright, Android (no Java touched).
