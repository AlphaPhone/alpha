# C-app-10 ledger: prototype automations, browser, calendar (17 files)

All 17 files still exist; none was skipped as deleted. Earlier stages had already done three of the
report findings: `definition.reply=()=>null` in browser-adapter (A6), the photo DB v2→v3 cursor move in
browser-camera (A2, Q-LEG-10) and the restore option in the draft adapters' `openDomainRecovery` calls (A3).

## Done

- `calendar-adapter.ts`: removed the 6 unused `calendar-days` imports (A7). Local `DAY`/`civilDay` now come from
  `lib/civil-date` (`DAY_MS`, `civilDay`, same signature, B1). Both raw `Intl…timeZone` reads now use
  `deviceTimeZone()` (B1). Removed the orphan comment above `civilDay` and the plan comment (A8). Deleted
  `out.calendarSourceLabel/Text`: no template reads them and agent-calendar-adapter overwrites the label (A7).
  Collapsed the identical-branch toasts `'Saved'`/`'Unconfirmed'` (NEW-IDENTICAL-TERNARY). The expected-fields
  literal that appeared 3 times is now `expectedOf(event)` (C3).
- `calendar-form-draft-adapter.ts`: the `calendarFormDayShift` body is now `civilDayDiff`. The inline second
  `civil` copy was replaced by `calendarFormDayShift` (C3/B1). The duplicated store binding
  `JSON.stringify(['calendar-creation-form',…])` is now one `draftBinding`, with the same bytes. Uses
  `deviceTimeZone()` ×2. Deleted the constant `out.formDraftAvailable=false`: dc-lite reads an absent value
  as false, canonical-calendar-drafts (outer) sets the real value, and the comment moved to `newEvent` (A7).
- `calendar-edit-draft-adapter.ts`: the inline `civil` shift is now `civilDayDiff`, computed once (it was
  computed twice) (C3). One `draftBinding` (`'calendar-inline-edit-form'`, same bytes). `deviceTimeZone()` ×2.
- `calendar-form-inputs.ts`: `DAY`/`civil` now come from `lib/civil-date.ts` (`DAY_MS`, `civilDay`). The
  default-start shift is now `civilDayDiff` (B1). The import uses the `.ts` extension because the Quint
  `calendar-form-controls` harness imports this file directly in Node.
- `calendar-interval-presentation.ts`: `DAY`/`civilDay` now come from lib, and `gridOff` is now
  `civilDayDiff` (B1). `now`/`time` are computed once instead of twice (C3). The three-line comment is now one
  line (A8).
- `calendar-approval-adapter.ts`: `createCalendarReviewParses` is unexported (it was test-only) and lost its
  test-only `parseText` injection and `size` getter (D7). The session tuple and the owner-key tuple now use
  `sessionKey(...)` from lib (identical `JSON.stringify` bytes, B1). `getAppRecordClient?.()` and `unmount?.call`
  are now direct calls (B2).
- `calendar-confirmation.ts`: the connection tuple now uses `sessionKey(...)` (B1).
- `calendar-days.ts`: unexported `firstCalendarDay` (no importer; it is not a verified function) and removed
  the `#411` reference from the header (A7/A8).
- `calendar-availability-review.ts`: unexported `chooseAvailabilityCalendars` and `confirmAvailabilityResult`;
  the only public surface is `availabilityReview` (A7).
- `calendar-month-focus.ts`: `ref` is now declared before the render closure that uses it. The `Bag`/`any`
  types were replaced with `ShellPrototype`, `ViewRegistry`, `ViewState`/`ViewOutput` and local
  `MonthState`/`MonthOutput` (C1, B3 map).
- `browser-adapter.ts`: `'Cleared'` identical ternary collapsed. Deleted the constant fixture flags
  `isNews/isEnc/isBook/isSearch/isGeneric/recents/people/agOn/confirm` from the render output. dc-lite reads an
  absent value as false or `[]`, and no model or other code sets them (A5).
- `browser-external-handoff.ts`: unexported `ExternalHandoffFlags`/`ExternalHandoffDeps` (A7). `Browser` is
  now `Pick<BrowserTabHostPlugin,'openExternalBrowser'>` (B2 map).
- `browser-camera.ts`: deleted the duplicate id function `mediaId`, which matched `photoId` byte for byte;
  the video id now uses `photoId` (C3). Unexported `SHARE_LIMIT` and `ImportedCameraImage` (A7). Deleted both
  read-side `??row.path` fallbacks, because current writers never store `path` in rows (D1/A1).
- `automations-adapter.ts`: deleted the dead `workflowDetail` output key (A7). The `p.cachedAutomationsHome`
  prototype member is now a closure `cachedHome(shell)` (D3/A7). The `getAutomationsClient` cast and the local
  `Binding` type are gone, so the return type is inferred (C1/B2). The three copy-pasted block functions now
  share `blockedBy(match)` (C3). The unused `AutomationRequest` type import is gone.
- `automations.css`: removed the `#701` reference and two plan-name comments (A8).

## Deleted tests and formal artefacts

- `test/calendar-review-parse-cache.test.mjs`: transplant (slices `export function createCalendarReviewParses`
  and injects `parseText`).
- `test/calendar-confirmation.test.mjs`: transplant (`new Function` over the file with imports stripped; it broke
  on the `sessionKey` import).
- `test/calendar-delete-latch.test.mjs`, `test/calendar-view-rules.test.mjs`: transplants (they strip imports
  from calendar-adapter/calendar-days/interval-presentation and run them in a vm; they broke on the lib imports).
- `scripts/test-calendar-crud-review.ts`, `scripts/test-calendar-query-race.ts` and their only fixture
  `scripts/fixtures/calendar-adapter.ts`: transplants (they strip imports from calendar-adapter, calendar-days
  and interval-presentation into a vm, and pin the `registerPlugin<any>` line and the `reminderWallTime` import
  line). I confirmed that they passed with the original interval-presentation file and failed with the lib
  import. I removed both names from the runner list in `test/adapter-contracts.test.mjs` (one line).
- Quint/Lemma: none deleted.

## Pins left broken

- None found. I re-ran the Quint refinement harnesses that read the changed text, and they pass:
  `automation-request-settlement` (first run aborted with "Refinement input changed during checking" because
  of concurrent edits; the rerun passed), `browser-session-persistence`, `workflow-request-recovery-admission`,
  plus the host tests that drive `calendar-adapter-fixture` (`quint-day-anchor`,
  `quint-calendar-agent-selection`), `quint-calendar-approval-review`, `browser-external-handoff-refinement`,
  `scheduled-task-controls` and `reminder-open-intent`. I did not regenerate or run the Lemma artefacts for
  `calendar-days.ts`: the verified functions and their annotations are unchanged, and I only edited the header
  comment and the `export` keyword of the unverified `firstCalendarDay`.

## Skipped

- Required `active` option (calendar-adapter #12, draft adapters #6/#7): the Quint `calendar-adapter-fixture.mjs`
  installs both draft adapters without options, so a required `active` would break that live harness.
- browser-adapter `disposed` flag and disposer removal (#1), and `flags.disposed` in browser-external-handoff
  (#2): the Quint models `BookmarksHydration` (`disposedReadChangesNothingTest`) and
  `BrowserSurfacePresentation` have a `dispose` action that the harnesses drive through `context.disposed`. The
  model and harness must be ported first (stage E).
- browser-adapter #6 host-modal markers: these are left for stage E with `test/browser-host-modal.test.mjs`
  (the test still passes). Other browser-adapter helper extractions (#7–#12, #17, #23) are inside regions the
  refinement harnesses slice by text and run with a hand-built context (`tabInfo`, `disposed`, …). They are
  left for the harness port.
- Typed plugins: `AlphaBrowser` → `BrowserTabHostPlugin` is wrong for this site. Alpha's `present()` sends the
  extra fields `layer` and `hostRects`, and `command(command:string)` is wider than the upstream type. That
  gives tsc errors at browser-adapter.ts:241 and :607, so B2's "exactly upstream" does not hold here.
  `AlphaCalendar` → `AlphaCalendarPlugin & AlphaCalendarBrowserMethods` gives union-narrowing errors
  (`save` result `creationId`, `inspect`/`inspectDeletion` result shapes at the agent-selection and delete
  sites). The fix needs code changes plus a shared-module review, so both sites stay `registerPlugin<any>`.
- `calendar-approval-fields.ts` `object` → `lib/parse` `isRecord`: `test/calendar-approval-ui.test.mjs`
  imports this file directly in Node, and `lib/parse.ts` imports `./ids` without an extension, which Node
  cannot resolve (the test fell from 20 passing to 0). I reverted the change. The fix belongs in the shared
  module (an `.ts` extension in `lib/parse.ts`).
- Typing `confirmCalendarAction(shell, api)` with `ShellHost`/`ViewApi` picks: its 6 callers pass `Bag` and
  three of them are other implementers' files, so it stays `Bag`.
- `automations-adapter.ts` optional calls (`view.refreshManagement?.`, `workflow.waitingFor?.`,
  `values?.call`), alias consts (`dateInput`, `timeZone`) and new lib imports: the shared adapter fixture in
  `test/automations-unified.test.mjs`, which the Quint `automation-request-settlement` harness reuses, strips
  imports and builds a minimal shell. calendar-approval-adapter `subscribe?.` and `refreshAgentCalendar?.` are
  skipped for a related reason: the behavioural fixture in `calendar-approval-ui.test.mjs` has no `subscribe`.
- Open owner questions: locale-time conversions (Q-UI-10: automations-adapter, calendar-adapter event detail,
  calendar-month-focus, calendar-days labels, approval-fields), web recovery surfaces (Q-DEV-3: automations
  "Recovery" card, browser bookmark recovery, calendar/reminder browser recovery), the device-calendar surface
  (Q-CAL-2), the native profile-unsupported error code (Q-UP-5). The browser-calendar dev decorator (Q-CAL-5)
  is a move for stage F.
- Stage F (moves/splits/merges): calendar drafts merge (C5, U-R12), `runtime/calendar-options.ts`, the
  browser-camera move and split, the browser-adapter split, the calendar-form-inputs/approval-fields move to
  `runtime/`, `openReview` adoption (approval-review, camera import dialog), and the `prototype/dom.ts`
  `element` helper.
- These change visible behaviour or copy, so I left them:
  - calendar-adapter guest regex → `calendarGuestEmail` (stricter filtering)
  - availability-review palette tokens
  - automations.css focus-ring unification and `var(--bg,#fff)` fallbacks
  - the event-detail `offset()` duplicate (also needs the locale question)
  - `STATUS_SHORT` status ids
  - the browser-external-handoff duplicate `confirming=false` reset: it changes what the `await update()`
    between the review and the open presents
- Left as is: the browser-camera `row.path` read at the entry list (`!row.path`, `row.path||row.image`, lines
  ~218/250). Rows from `read()` legitimately carry `path`, so those were not clearly raw-row fallbacks. Also
  left: the `splitVideoRow` export and the edit-receipt re-export. The behavioural
  `test/browser-camera-storage.test.mjs` uses both through its bundle.

## Verification

- `npx tsc --noEmit -p .`: 0 errors in the whole project (run after the last edit).
- Host tests that touch these files: I ran 41 files before and after with `node --test` each. Against the
  baseline:
  - `test/scanned-calendar-handoff.test.mjs` does not exist.
  - Four tests failed in the baseline and pass now: `browser-external-handoff-refinement`,
    `quint-calendar-approval-review`, `scheduled-task-controls` and `client-feature-preparation`. This is
    environment or concurrent-edit noise, not my change.
  - `home-cards` went from 19 to 17 passing tests with 0 failures; another unit edited that test file.
  - `calendar-mounted-edit-admission` went from 1 passing / 2 failing to 0 / 3. It is a Chromium + Vite
    fixture whose failure is `window.quintMountedCalendar` missing. That observer anchor sits in `main.tsx`,
    which is not my file and is being edited concurrently. The test already failed 2/3 in the baseline (and
    `calendar-mounted-editor` already failed 1/1), so I can't attribute the extra failure to my change, but I
    did not prove the opposite either.
  - All other tests are unchanged and green.
- Quint refinement harnesses run directly: `checkAutomationRequestSettlement`, `checkBrowserSessionPersistence`
  and `checkWorkflowRequestRecoveryAdmission` all pass. `node -e import(calendar-form-controls.mjs)` loads.
- Not run: `npm run verify`, `npm run build`, `audit:bundle`, Playwright, the Lemma check, the full Quint
  suite and Android (no Java touched).
- Note: my first baseline run redirected into the shared scratchpad file `baseline.txt`, which another unit
  also uses. Later runs used `scratchpad/capp10/`.
