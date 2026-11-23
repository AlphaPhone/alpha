# Alpha parity audit: `shell` + `clock`

Trees: legacy `alpha-develop` (dd63c6bc), port `alpha-vs` (3d7ca972). Read-only; nothing was built or run.
Paths are relative to each tree's root unless prefixed. "Port" = `alpha-vs/apps/app/...`.

## Summary

| Class | Count |
|---|---|
| OK | 36 |
| CHANGED | 6 (G1, G4, G11 ×2, G12, G19) |
| MISSING | 9 (G2, G7 upcoming, G8, G10, G13 ×2, G14, G15, G16) |
| UNIMPLEMENTED | 8 (G3, G5 ×2, G6, G7 overdue, G9, G17, G18) |
| UNMODELED | 0 |
| UNVERIFIED | 4 |
| KNOWN (open-items bullets that touch this slice) | 9 |
| RETIRED | 3 |
| Vibestack-usage findings | 6 |

Verdict: **not at parity.** The machines are well specified (every `###` rule in `spec/shell` and
`spec/clock` has a Quint block, and the shell/clock services call the generated machines), and the
Android classes for this slice are a superset of legacy. The gaps are almost all at the edge between
a machine and the screen, where nothing was ever run: several spec'd behaviours have a model and no
consumer (landscape layout, the fitted canvas, the Home brief, overdue reminders on Home, the toast
inside a dialog, the touch pull for Android's shade), a few legacy behaviours were dropped without a
rule (predictive Back, tap-to-dismiss toasts, the keyboard entry menu), and four product-level
differences an owner would see on first boot (Reminders has no way in and no longer shows in
Calendar; the agent's reminder card no longer says when the reminder is due; an upward scroll on
Home opens chat; Home grew a Notifications bell and a Clock tile). Legacy pending reminder journals
are not adopted across the update. No Dafny proof and no conformance driver exists for either area.

## Gaps

Most severe first. "Smallest fix" names the spec file for the rule and the code file for the change.

### G1. CHANGED — Reminders has no way in, and reminders no longer show in Calendar
- Behaviour: legacy lists, creates and acts on reminders inside Calendar; the port moved them to a
  separate Reminders screen that no owner control opens.
- Legacy: `apps/app/src/product/alpha-product-registration.ts:304` (13 Home views, none is
  Reminders or Clock), `:322` (`serves: { calendar: ["reminders"] }`);
  `apps/app/src/prototype/calendar-adapter.ts:132-133` (reminder rows merged into the day's events),
  `:216` ("Retry calendar and reminders").
- Port: `spec/shell/index.md:53-58` (`homeRank` has no `reminders`);
  `src/shell/launcher.vibe:66-68` (`addableViews` offers only Home defaults, so the Add sheet cannot
  add it); `src/web/clock/index.tsx:31` (the screen exists); the only openers are
  `src/clock/reminders.vibe:135`, `src/clock/reminder-taps.vibe:62` (a tapped notification) and
  `src/web/shell/OverviewCards.tsx:74` (the overdue card, which is never fed, G7). `listReminders` is
  read only under `src/clock/**`; `src/web/calendar/**` renders no reminder row.
- Impact: on a fresh phone the owner cannot list, create, complete or delete a reminder by hand.
- Fix: decide the home of reminders. Either give `reminders` a rank in `spec/shell/index.md`
  (`homeRank`) and a title in `src/shell/apps.vibe`, or restore the Calendar listing
  (`spec/calendar/presentation.md` + `src/web/calendar/CalendarScreen.tsx`) with a row that opens
  `reminders/<id>`.

### G2. MISSING — the agent's reminder review card no longer says when, with what alert, or how often
- Behaviour: before approving an agent-proposed reminder the owner saw title, body, due time with
  zone, alert time, "delivery may be approximate" and the repeat rule; an update said "Timing
  unchanged."; the receipt kept the exact instant.
- Legacy: `test/reminder-card-presentation.test.mjs:8-24` (over
  `apps/app/src/runtime/device-record-presentation.ts`).
- Port: `src/clock/operations.vibe:121-134` (`describeOwned`: `reminder_create` and
  `reminder_update` return only `op.fields.title`; complete/snooze say "The reminder you have
  open."); `src/assistant/review.vibe:304,342,577` take the card text from `ports.describe`. No rule
  in `spec/clock/agentReview.md` covers card content.
- Impact: consent gate. The owner approves a reminder (or a reschedule, or a snooze length) without
  seeing its time.
- Fix: rule in `spec/clock/agentReview.md` ("A reminder card names the due time, alert and repeat it
  will save"); render `fields.schedule` in `describeOwned` (`src/clock/operations.vibe`) with
  `src/web/clock/text.ts` formatters, minute-rounded on the card and exact in `summarizeOwned`.

### G3. UNIMPLEMENTED — a touch pull on Home cannot reach Android's shade
- Behaviour: on launcher Home a downward touch pull opens Android's shade; Home that fits gives
  vertical drags to the page, and an overflowing Home claims the pull at its top after 6 px.
- Legacy: `apps/app/src/prototype/system-shade.ts:63-74` (`markHomeFits`), `:96-101`
  (`installOverflowPull` only while Home shows); `apps/app/src/prototype/phone.css:94`
  (`touch-action: pan-x pinch-zoom` when Home fits); `test/system-shade.test.mjs`,
  `test/browser/notifications-handle.spec.ts` ("a downward touch pull at the top of an overflowing
  Home opens the shade").
- Port: spec has it (`spec/shell/gestures.md:200-224`, `overflowPull`), but `overflowPull` has no
  caller anywhere in `src/`; `src/web/shell/HomeScreen.tsx:52-59` is a plain `overflow-y-auto`
  section with no touch-action and no touch listeners; the pull is decided only in
  `src/web/shell/ShellRoot.tsx:140-158` on `pointerup`, which a WebView does not deliver once it
  takes the drag for scrolling/overscroll. `ShellRoot.tsx:151` also hard-codes `scrolled = false`,
  so a Home scrolled away from its top is not excluded.
- Impact: on a real phone the pull most likely does nothing (device-unverified; nothing was run).
- Fix: `src/web/shell/HomeScreen.tsx` — mark fit and set touch-action, add the non-passive touch
  claim driven by `overflowPull`; pass real `scrolled` in `ShellRoot.tsx`.

### G4. CHANGED — an upward swipe on Home opens chat, and any downward swipe lowers a half sheet
- Behaviour: legacy Home scrolls freely and only the dock opens chat; swipes that begin in the
  transcript or end with a text selection are ignored.
- Legacy: `apps/app/src/prototype/model.js:5706-5714` (`raise-assistant` is resolved but never
  acted on), `:5701` (`gDown` drops gestures starting in `[data-alpha-transcript]`), `:5702`
  (selection guard); `test/browser/notifications-handle.spec.ts:95-98` ("Home content scrolls
  independently. The dock is the explicit chat entry").
- Port: `src/web/shell/ShellRoot.tsx:156-157` acts on both `LowerAssistant` and `RaiseAssistant`
  for a pointer anywhere on the screen; no transcript or selection exclusion.
  `spec/shell/gestures.md:164-170` states "an upward one on Home raises the assistant".
- Impact: scrolling Home up by 46 px opens the chat sheet; dragging down inside an open half
  conversation collapses it. On comms apps the lowered detent is `Hidden`, not the app's rest
  (`ShellRoot.tsx:156` vs legacy `this.rest()`).
- Fix: drop `RaiseAssistant` from `swipe` in `spec/shell/gestures.md` (or mark it owner-decided);
  in `ShellRoot.tsx` ignore gestures that start in the transcript/composer and lower to
  `restOf(app)`.

### G5. UNIMPLEMENTED — landscape side-by-side layout and the fitted 412 px canvas
- Behaviour: a landscape touch window docks Home beside the composer/conversation; the launcher and
  desktop preview keep a fitted 412 px canvas; swipe zones are in canvas pixels.
- Legacy: `test/browser/home-landscape.spec.ts:17-76`; `test/canvas-geometry.test.mjs` (over
  `apps/app/src/runtime/canvas-geometry.ts`); `apps/app/src/ui/mobile-shell/gestures.ts:68-71`
  (412 / 30 / 872 canvas constants); `apps/app/src/prototype/model.js:5700` (pointer → canvas scale).
- Port: `src/shell/geometry.vibe:27,32-35` publishes `--alpha-canvas-width`, `alpha-landscape`,
  `alpha-wide`, `alpha-large-text`, `alpha-text-xl`; nothing under `src/web/**` reads any of them
  (the open-items "Tailwind variant `[html.alpha-landscape_&]`" is not used anywhere).
  `ShellRoot.tsx:152` feeds raw `clientX/clientY` to `swipe`, whose edges are fixed at
  `x > 412 - 30` and `y > 872` (`spec/shell/gestures.md:178-181`).
- Impact: no landscape arrangement; right-edge Back and the bottom-bar HOME swipe miss on any window
  that is not 412 CSS px wide / taller than 872.
- Fix: consume the classes in `src/web/shell/ShellRoot.tsx` and `src/web/assistant/AssistantDock.tsx`;
  scale pointer coordinates by `canvasWidth / innerWidth` before `swipe` (or make `swipe` take the
  canvas size in `spec/shell/gestures.md`).

### G6. UNIMPLEMENTED — Home's brief card is never fed
- Legacy: `specs/quint/application/RetainedHomeBrief.qnt`; `test/quint-retained-home-brief.test.mjs`;
  `test/browser/home-brief-result.production.spec.ts` ("a digest result from the agent reaches the
  Home brief card").
- Port: rule `spec/shell/overview.md:125` and `src/web/shell/OverviewCards.tsx:91-97` draw it, but
  `Overview.reportBrief` (`src/shell/overview.vibe:98`) has no caller in `src/`;
  `src/workflows/digests.vibe:159-162` computes a brief and keeps it in the Workflows panel only.
- Impact: the scheduled brief never appears on Home.
- Fix: `src/workflows/digests.vibe` — call `Overview.reportBrief(outcome, at, title)` where the
  panel's brief changes (scoped to the bound connection, as `RetainedHomeBrief` required).

### G7. UNIMPLEMENTED + MISSING — reminders never reach Home's agenda
- Legacy: `test/browser/home-daily-overview.spec.ts:114` (overdue reminder stays on Home, counts,
  "Next:" line), and the tests "an upcoming reminder is attributed to the reminder store" /
  "an upcoming reminder leads Home under Agent Calendar"; `test/home-cards.test.mjs` ("next item
  under Agent Calendar…").
- Port: `Overview.reportOverdue` (`src/shell/overview.vibe:101`) is called only by
  `test/shell/stories.test.vibe:402`. Upcoming (not overdue) reminders are in no shell rule
  (`spec/shell/overview.md:170` covers overdue only); `spec/calendar/home.md:55-62` (`nextLead`) has
  no caller in `src/`.
- Impact: an overdue or imminent phone reminder is invisible on Home.
- Fix: `src/clock/reminders.vibe` `refresh()` → `Overview.reportOverdue(...)` after each listing;
  add the upcoming-reminder lead to `spec/shell/overview.md` or wire `nextLead` in
  `src/calendar/**` (calendar slice).

### G8. MISSING — legacy reminder and Clock journals are not adopted on update
- Behaviour: reminder creations/changes journaled before the update are reconciled, never re-sent.
- Legacy slots: `apps/app/src/runtime/reminder-creations.ts:11` (`reminder-creations:v1:device`),
  `apps/app/src/runtime/reminder-deletions.ts:6` (`reminder-deletions:v1:device`),
  `apps/app/src/runtime/clock-handoff-history.ts:11` (`clock-handoff:v1:device`).
- Port: new owner keys only (`src/clock/layer.vibe:47-56`, `device:clock/reminder-journal`,
  `…/clock-handoff`); no reference to the v1 slots in `src/clock/**` or `spec/clock/**`, and they
  are not in the open-items "Legacy slots not carried over" list.
- Impact: a reminder save or deletion in flight during the hard cut loses its journal record (the
  exactly-once guarantee does not span the update); the last Clock handoff reads as "none".
- Fix: add adoption to `spec/clock/reminderJournal.md` / `handoffHistory.md` and read the three
  slots once in `src/clock/layer.vibe` — or add them to the owner's "accept losing" list.

### G9. UNIMPLEMENTED — a toast raised while a dialog is open is outside the dialog
- Legacy: `specs/quint/application/ModalToastForwarding.qnt`;
  `test/quint-modal-toast-forwarding.test.mjs` (toast copied into the topmost dialog's live region,
  Undo runs the page's Undo).
- Port: rule `spec/shell/toasts.md:188-196` (`toastHost`, unused in `src/`).
  `src/web/shell/ToastRegion.tsx:27` only swaps a class when `inDialog`; the region stays in
  `ShellRoot` while `Dialog`/`Sheet` portal to `body` (`src/web/components/ui/Dialog.tsx:26`,
  `Sheet.tsx:34`), which hides and inerts everything outside the modal.
- Impact: errors and Undo raised from inside a sheet are neither announced nor tappable.
- Fix: render the shown toast inside the top `DialogContent`/`SheetContent` (a context in
  `src/web/components/ui/Dialog.tsx` + `ToastRegion.tsx`), chosen by `toastHost(nav.layers)`.

### G10. MISSING — predictive Back preview
- Legacy: `apps/app/src/runtime/predictive-back.ts:1-75`;
  `test/browser/haptics-predictive-back.spec.ts` ("held Back previews the review it would close;
  cancelling restores it…", "reduced motion previews nothing").
- Port: Android still emits it (`android/.../MainActivity.java:493-507`); the renderer has only an
  unused schema (`src/shell/native.schema.vibe:24-25`); no rule. `scripts/legacy-retirement.json`
  maps that test to `spec/shell/haptics.md`, which has no such rule.
- Fix: rule in `spec/shell/navigation.md` ("A held Back previews the layer it would close"); a
  listener in `src/shell/navigation.vibe` + transform in `src/web/shell/InlineSheet.tsx`.

### G11. CHANGED — Home has a Notifications bell; the browser build shows a second one and a shade
- Legacy: `test/browser/notifications-handle.spec.ts:1-8,42-56` ("Home has no notifications
  control", issues #416/#417; standalone has no pull and no control);
  `apps/app/src/prototype/system-shade.ts:15-27` (the simulated shade is test-mocks only).
- Port: `src/web/shell/ShellRoot.tsx:170` (`notifications={launcherHost || nav.host === "Standalone"}`),
  `src/web/shell/HomeScreen.tsx:60-66`; `src/web/clock/NoticesSurface.tsx:88-103` shows a bell and
  `NotificationShade` for every browser build, not only test-mocks. `spec/shell/shade.md:4-5` now
  names "Home's notifications control".
- Impact: a control the owner removed is back; a production browser build offers a shade with no
  store behind it (KNOWN K1).
- Fix: owner decision. To restore legacy: drop the prop in `ShellRoot.tsx`/`HomeScreen.tsx`, gate
  `NoticesSurface.tsx:88,93` on `buildInfo().testMocks`, and remove the phrase from `shade.md`.

### G12. CHANGED — Clock is a new Home tile with timers, a stopwatch and world clocks
- Legacy: no Clock view on Home (`alpha-product-registration.ts:304`); the alarm handoff is the
  "Clock alarms" page inside Workflows (`apps/app/src/prototype/template.html:3414`,
  `apps/app/src/prototype/clock-adapter.ts:17`; commit fa4c259fe "move alarms into Workflows").
  Legacy has no timers, stopwatch or world clock.
- Port: `spec/shell/index.md:53-58` (`clock` is rank 14); `src/web/clock/ClockScreen.tsx:66-115`;
  `spec/clock/{timers,stopwatch,worldClock}.md`.
- Impact: additive, but it reverses a November owner decision and adds unreviewed features. A
  ringing timer rings only while the page is in front (`keepTime`, `src/clock/clock.vibe:129-206`).
- Fix: owner decision; if reverted, remove `clock` from `homeRank`.

### G13. MISSING — a plain toast cannot be dismissed, and focus does not return when a toast ends
- Legacy: `test/browser/shell-toast.spec.ts:71-92` (focus returns to the origin after Undo/expiry),
  `:94-99` (tap dismisses), `:116-128` (Enter/Space dismiss and restore focus).
- Port: `src/web/shell/ToastRegion.tsx:33-42` renders a `div` with no click/key handler; the toasts
  machine has no dismiss for the shown toast (`spec/shell/toasts.md:123-136`: only `expire` and
  `takeAction`).
- Fix: add `dismissShown(seq)` to `spec/shell/toasts.md`; make the message a button in
  `ToastRegion.tsx`; remember and restore the focus origin in `src/shell/notices.vibe`.

### G14. MISSING — the agent's reminder receipt hides a failed notification
- Legacy: `apps/app/src/ui/reminders/reminder-result-messages.ts:19-36`, used at
  `apps/app/src/prototype/agent-adapter.ts:1428,1449` ("Reminder saved, but notifications are
  disabled.").
- Port: `src/clock/operations.vibe:137-144,163` — always "Reminder created." etc.; the owner path
  does model it (`spec/clock/reminders.md:38`, `Delivery`).
- Fix: read `result.status` in `summarizeOwned` (`src/clock/operations.vibe`) via `deliveryOf`
  (`src/clock/schedule.ts:140`); rule in `spec/clock/agentReview.md`.

### G15. MISSING — the library entry menu is not a keyboard menu
- Legacy: `apps/app/src/ui/mobile-shell/InstalledAppsGridDrawer.tsx:112-140` (focus moves in;
  ArrowUp/Down/Home/End), `:302` (Escape closes, focus back to the tile);
  `test/browser/home-app-library.spec.ts` ("the entry menu is a keyboard menu…").
- Port: `src/web/shell/AppLibrary.tsx:95-112` — `role="menu"` buttons with no focus move, arrow or
  Escape handling.
- Fix: `src/web/shell/AppLibrary.tsx` (use the existing `DropdownMenu` primitive or add the key
  handler); one sentence in `spec/shell/focus.md`.

### G16. MISSING — no "Try again" after a failed installed-app read
- Legacy: `InstalledAppsGridDrawer.tsx:604`; `test/browser/home-launcher.spec.ts:44-58`.
- Port: `src/web/shell/AppLibrary.tsx:86-87` (`EmptyState` only).
- Fix: an action on that `EmptyState` calling `Launcher.openLibrary()`'s read (`installed.load()`).

### G17. UNIMPLEMENTED — a locked Home still asks for the shade
- Legacy: `apps/app/src/prototype/model.js:5678-5679` ("Unlock to see notifications").
- Port: rule `spec/shell/shade.md:32-36` (`lock`) and `emptyHome(..., secure, ...)`
  (`spec/shell/gestures.md:209-211`); `src/shell/shade.vibe` never sends `lock`, and
  `src/web/shell/ShellRoot.tsx:147` passes `false`.
- Fix: follow `Foreground.changes` in `src/shell/shade.vibe` and pass `locked` in `ShellRoot.tsx`.

### G18. UNIMPLEMENTED — admitted apps are not re-read on return to the foreground
- Port: rule `spec/shell/navigation.md:466-469` ("at start and on every return to the
  foreground"); `src/shell/navigation.vibe:130-138` re-sends the list computed once at boot
  (`:161-162`).
- Impact: low (admission is a build fact today). Fix: recompute `admittedApps(build.info)` or drop
  the sentence.

### G19. CHANGED — persistent notices are listed at the top of every screen, not in the chat
- Legacy: `test/browser/shell-toast.spec.ts:160-186` ("stays in the chat until Dismiss", in page
  flow, 48 px Dismiss, focus moves to the chat header after dismissal).
- Port: `src/web/shell/ShellRoot.tsx:211-214` (`NoticesSlot` absolutely positioned under the
  header); `ToastRegion.tsx:56-72` (the dismiss button is `p-1` around a 16 px icon).
- Fix: owner decision on placement; raise the hit target in `ToastRegion.tsx`.

### UNVERIFIED
- U1. The open library following installs/removals. Upstream `createLauncher` refreshes itself on
  `appsChanged` (`eliza-vs/packages/os/src/bridges/system.vibe:671-680`), but the port publishes a
  snapshot only inside `settle()` (`src/shell/launcher.vibe:45-49,195-200`) and never sends
  `PackagesChanged`/`Resumed` to the inventory machine (`:276-281` sends only `Hidden`/`Visible`).
  Legacy: `test/browser/home-app-library.spec.ts` ("an open drawer follows installs and removals").
  Needs a run.
- U2. "Opening an existing Google panel hides required setup and closing it resumes the same step"
  (`test/startup-permission-completion.test.mjs`). `walkthroughOpens` takes `busy`/`signingIn`
  (`Permissions.connection`, `src/shell/permissions.vibe`); whether the account sheet sets them was not traced.
- U3. The assistant surface drawing "chat and Close only" (`test/browser/home-native-launcher.spec.ts`).
  `ShellRoot.tsx` always renders `HomeScreen`; what boot does for `AssistantSurface` lives in the
  generated navigation machine, which does not exist yet.
- U4. `src/clock/agent-review.vibe`, `deletions.vibe`, `workflow-notices.vibe`, `drafts.vibe`,
  `reminder-page.vibe` and lines 140-385 of `reminders.vibe` were not read line by line; their rules
  exist and their tests name them, no more is claimed.

### KNOWN (open-items bullets that cover this slice)
- K1. Browser build has no reminder, notification or deletion store (Owner decisions). Covers legacy
  `dev-notification-queue`, `dev-notifications`, `reminder-*-storage`, `browser-reminder-*`,
  `reminder-notification-dismissal`, `host-reminder-recovery` specs and
  `BrowserReminderOrphan/BrowserOwnerReminderRead/Action.qnt`.
- K2. Which chat detent model wins (`spec/shell/navigation.md` vs `spec/assistant/dock.md`).
- K3. `AppServices` must contain the machines of `clock__notifications` and `clock__reminderTaps`
  (Shell integration); until then `src/web/clock/index.tsx:39-46` Back for those sheets is unwired.
- K4. Clock has no listener for native `remindersChanged`, `notificationsChanged`, `mirrorChanged`;
  the workflow notice question does not use `workflowStepSource` (Areas consuming assistant changes).
- K5. `spec/shell/system.md` (home-start handoff, text zoom, Settings shortcuts) has no renderer
  path (Android / native). `effectiveZoom`, `homeStart`, `settingsReply`, `specificPage`,
  `unreliableAfter` are referenced nowhere in `src/`.
- K6. `pageVisible` disagreement between `src/clock/page.ts` and `src/platform/build-flags.ts`.
- K7. Foreground calendar alert catch-up (legacy `calendar-alerts.ts`) not ported.
- K8. Browser's simulated agent Clock handoff (legacy `test/browser/agent-clock-handoff.spec.ts`,
  `journey-c-alarms.spec.ts` in the browser) not ported.
- K9. Hardware Back does not close an empty Inbox search field; `index.html` has no CSP for the
  landing route.

### Vibestack usage
- V1. **No Dafny proofs.** `find alpha-vs -name '*.proof.dfy'` is empty. Legacy proofs in this slice
  with no counterpart: `specs/lemma/apps/app/src/startup-permission-flow.dfy` (walkthrough opens /
  late Ready notice), `specs/lemma/apps/app/src/runtime/canvas-geometry.dfy` (scale > 0, landscape
  and wide iff conditions), `specs/lemma/apps/app/src/browser/notifications.dfy` (notice route
  classification, bounded dismissed-id retention). The old `.dfy` files are still in the port tree
  and verify source that no longer exists.
- V2. **No conformance drivers.** `apps/app/test/drivers/` has 10 files (workflows 7, telephony 2,
  notes 1) and none for the 17 shell or 20 clock machines. `test/shell/*.vibe` and
  `test/clock/*.vibe` are 43 + 39 hand-written story tests; none replays generated cases. Legacy had
  trace replays for the same properties (`specs/quint/refinement/application/shell-coordinator.mjs`,
  `startup-permissions-coordinator.mjs`, `reminder-open-intent.mjs`,
  `refinement/native/HomeInstanceHandoffReplay.java`, `ClockReviewTraces.java`,
  `ReminderDeliveryTraces.java`).
- V3. **Shell code re-implements a model.** `src/clock/reads.ts:57-82` decides the day read itself;
  `readOpen`, `readInDay`, `dueToday`, `sharedOf`, `sharedCount` of `spec/clock/reminderReads.md`
  have no caller. `src/web/shell/ShellRoot.tsx:156` picks the lowered detent in the component.
- V4. **Dead model definitions** (no reference in `src/` or `test/`): `overflowPull`
  (gestures.md), `toastHost` (toasts.md), `unmount` (gestures.md and overview.md),
  `dismissViewNotice` (recovery.md), `pressAssistant` and `closeInner` (navigation.md), shade
  `lock`, inventory `PackagesChanged`/`Resumed` signals, all of system.md (K5).
- V5. **Rules whose Quint block carries no invariant, witness or law:** focus.md "Focus is reported
  as it moves"; gestures.md "Unmounting retires every gesture…"; navigation.md "Hiding the page
  retires…"; overview.md "The brief card shows…"; alarms.md "An alarm has a time…";
  canonicalTaps.md "One tap is handled at a time…" and "A tap for another account…"; handoff.md
  "Preparing shows the exact request…"; reminderTaps.md "A link the owner leaves pending…";
  stopwatch.md "Reset clears…"; timers.md (three rules); vocabulary.md "A handoff asks Clock…".
- V6. **Components without `.meta.tsx`:** shell `AppFrame`, `CallbackLanding`, `ErrorBoundary`,
  `InlineSheet`, `ShellRoot`, `StandInShade`, `TileGrid`; clock `ClockScreen`, `NoticesSurface`,
  `RemindersScreen`. Also: all 70 shell and 53 clock rows of `scripts/legacy-retirement.json` say
  `mapped`, several to a spec that cannot hold the behaviour (`home-landscape.spec.ts`,
  `shell-toast.spec.ts`, `notifications-handle.spec.ts` → `shell/index.md`;
  `dev-clock.spec.ts` → `clock/worldClock.md`), and the legacy tests left in `alpha-vs/test/`
  import deleted source (`test/haptics.test.mjs:10` imports `apps/app/src/runtime/haptics.ts`).

### RETIRED
- `test/browser/notification-storage-migration.spec.ts`, `test/browser/reminder-storage-migration.spec.ts`,
  `test/home-views-model.test.mjs`: in the area lists but already absent from `develop` (removed
  with #1422).

## Confirmed OK

Both sides read; spec rule and code cited. "Port" paths are under `alpha-vs/apps/app/`.

| Behaviour | Legacy | Spec rule | Code |
|---|---|---|---|
| AOSP-only apps offered only on the image | `product/alpha-product-registration.ts:304` | shell/index.md "An app is offered only where…" | `src/shell/apps.vibe:12,37`, `src/web/shell/registry.ts:45-58` |
| Back closes top layer, launcher layers, assistant, app; `data-alpha-can-go-back` | `test/home-shell.test.mjs`, `home-native-launcher.spec.ts` | navigation.md "Back closes the topmost layer first…" | `src/shell/navigation.vibe:89-110,60-64` |
| HOME intent returns Home and closes the drawer | `home-launcher.spec.ts:20-42` | navigation.md "HOME returns to Home…" | `navigation.vibe:116-120` |
| App keeps its place; restart restores app and history | `standalone-shell.spec.ts`, AC-30 | navigation.md "Each app keeps one place", "Booting brings back…" | `src/shell/layer.vibe:41-44`, `src/web/shell/AppFrame.tsx:20-44` |
| Assistant surface only by Alpha's own activity flag | `home-native-launcher.spec.ts` ("launch extra alone keeps Home") | navigation.md "Hiding the page retires…" | `navigation.vibe:39-53` |
| Favorites keys, v1/v2 import, defaults, explicit empty Home | `test/quint-launcher-favorites.test.mjs`, `home-shell.test.mjs` | favorites.md (4 rules) | `src/shell/launcher.vibe:106-110,287-289` |
| Home press custody, 450 ms hold, edit mode, drag, arrows/Delete | `test/quint-home-gesture.test.mjs` | gestures.md "One pointer owns…", "A hold…", "A tap opens…" | `launcher.vibe:236-262,364-372`, `src/web/shell/TileGrid.tsx` |
| Edit-mode save failure shown in the edit bar | `home-shell.test.mjs` ("a favorites save that fails…") | toasts.md "Home reports a failed launch once…" | `launcher.vibe:174-177`, `HomeScreen.tsx` (`editError`) |
| Launch error / failed inventory reported once on Home | `home-shell.test.mjs` ("Home toasts a failed launch…") | toasts.md same rule | `launcher.vibe:179-193` |
| Library search, same-label detail, dial shortcut only without Phone | `installed-launcher-search.test.mjs` | navigation.md "The library, its entry menu…" | `launcher.vibe` (`publish`, `libraryKeys`), `ShellRoot.tsx` (`dial=`) |
| App info for the exact entry, one request, refusal shown | `home-shell.test.mjs` | appInfo.md (2 rules) | `launcher.vibe:329-346` |
| Shade request: one at a time, 5 s wait, truthful fallback, late answer ignored | `system-shade.ts:36-49`, `quint-shade-pull.test.mjs` | shade.md (2 rules) | `src/shell/shade.vibe:41-49,65-74` |
| Toast lifetime, queue, 10 s Undo, accessibility timeout scale, assertive failure | `shell-toast.spec.ts:1-60`, `AccessibleToastLifetime.qnt` | toasts.md "A toast's time is fixed…", "A toast waits its turn…" | `src/shell/notices.vibe:33-61,70-80`, `ToastRegion.tsx:22-31` |
| Persistent notice announced once and listed until dismissed | `shell-toast.spec.ts:160-170` | toasts.md "A persistent notice…" | `notices.vibe:88`, `ToastRegion.tsx:56-72` (placement differs, G19) |
| Focus after screen change, closed modal, re-rendered list; keyboard-only ring | `view-focus.spec.ts`, `ScreenFocusOwnership.qnt`, `ListFocus.qnt` | focus.md (5 rules) | `src/shell/focus.vibe:27-133`, `AppTile.tsx:38-39` |
| Keyboard-free height, composer release, measured text scale, dock/header clearance | `canvas-geometry.test.mjs`, `DockClearanceOwnership.qnt` | geometry.md (4 rules) | `src/shell/geometry.vibe:38-69`, `src/shell/page.ts:60-190` |
| Walkthrough order, one prompt per permission, Settings after refusal | `startup-permission-completion.test.mjs` | permissions.md "A step's request is the owner's tap…" | `src/shell/permissions.vibe:297-311,90-94` |
| Walkthrough resume, failed save warning, legacy record import | same; `startup-permission-progress.ts:8` | permissions.md "resumes from what was saved", "An earlier Alpha's…" | `permissions.vibe:209-217,254-267` |
| 20 s Skip, generation fencing, re-read on return | same ("skip escapes a pending media request…") | permissions.md "A step still checking…" | `permissions.vibe:224-227,278-285` |
| Alpha image: granted steps pass, untouched run ends on Home | same ("Alpha image: …") | permissions.md "On the Alpha image…" | `permissions.vibe:229-233` and `follow()` |
| Back on the walkthrough; review from Settings | same ("Back on Ready finishes setup") | permissions.md "Back leaves a review…" | `permissions.vibe:271-277`, `src/settings/navigation.vibe:131` |
| Failed app closes, Home says which; recovery screen; Switch Home only on launcher | `test/error-boundary-home-escape.test.mjs` | recovery.md (3 rules) | `src/shell/recovery.vibe:46-80`, `ErrorBoundary.tsx`, `RecoveryScreen.tsx` |
| Haptics: switch, destructive confirm, long press, once per gesture | `test/haptics.test.mjs` | haptics.md (2 rules) | `src/shell/haptics.vibe:17-38`, `page.ts:206-224` |
| Agent `open_view` applied only when in front | `ui/shell/completed-action-navigation.ts` | navigation.md "An approved open_view…" | `src/shell/operations.vibe:24-45` |
| Android launcher, HOME hand-off, notification, reminder classes | `android/app/src/main/java/**` | system.md (native side) | port tree is a superset; only `AlphaNotificationsPlugin`, `AlphaNotificationListener`, `AlphaReminders`, `MainActivity` gained code |
| Clock handoff: review, record before open, zone change, hidden retires | `prototype/clock-adapter.ts:62-92` | handoff.md "Confirming records the handoff…" | `src/clock/handoff.vibe:82-108` |
| Repeat days only where Clock carries them | `clock-adapter.ts:23-36`, `clock-repeat.production.spec.ts` | handoff.md "A repeating alarm is reviewed only…" | `handoff.vibe:61-66`, `src/clock/operations.vibe:85-99` |
| Interrupted handoff reads unknown, never resent | `clock-adapter.ts:38-46` | handoffHistory.md "A record left opening…" | `handoff.vibe:92-107` |
| Capabilities advertised only where carried | `test/reminder-capability-negotiation.test.mjs`, `alpha-product-registration.ts:339-340` | agentReview.md "Clock advertises a Clock handoff only…" | `operations.vibe:70-99` (`OFFERS`, `advertisedBy`, `clockCapabilities`) |
| Agent reminder change refused when the target moved | `reminder-decision-review.spec.ts` | reminders.md "A reminder that changed since it was shown…" | `operations.vibe:223-236` |
| Day read bound and overflow | `test/workflow-reminder-read.test.mjs` | reminderReads.md (3 rules) | `src/clock/reads.ts:57-82` (re-implemented, V3) |
| Reminder refusal sentences | `ui/reminders/reminder-refusal-message.ts` | reminders.md `Refusal` | `src/web/clock/text.ts:102-105` |
| Listing refresh: newest publishes, failed keeps last, journal reconcile by receipt | `ReminderRefresh.qnt`, `ReminderIntents.qnt` | reminders.md "Only the newest refresh publishes…" | `src/clock/reminders.vibe:96-138` |
| Canonical tap: one at a time, same account, not while composing | `CanonicalNotificationTapAdmission.qnt` | canonicalTaps.md (4 rules) | `src/clock/canonical-taps.vibe:20-60` |
| Browser alarms/timers ring with one lock, alarm-stream level, DND | `dev-clock.spec.ts`, `BrowserAlarmRinging.qnt` | ringer.md, alarms.md | `src/clock/clock.vibe:129-206` |
| Reminder alerts blocked by channel or group | `test/native-notification-channels.test.mjs` | mirror.md "Reminder alerts are blocked…" | `src/clock/mirror.vibe:49-55` |

## Not covered

Exact, for re-assignment:

1. `spec/assistant/detents.md` and `dock.md` against `test/browser/standalone-shell.spec.ts`
   (pill/bar/sheet drags, late-click swallow, half-sheet scrim), `home-overlay-stability.spec.ts`,
   `dock-clearance.spec.ts`, `full-bleed-dock-clearance.spec.ts`; `src/web/assistant/AssistantDock.tsx`
   was not read.
2. `test/browser/comms-shell.spec.ts` and `test/comms-shell-model.test.mjs` (comms bars, stage,
   emergency call layout) — telephony surface.
3. Update gate on Home (`home-native-launcher.spec.ts` "a new Android WebView holds Home until its
   update settles" and the three draft-readback tests; legacy `ui/state/app-update-gate.ts`) —
   settings/updates.
4. Calendar/Inbox/Workflows cards on Home beyond the shell's own machine
   (`home-daily-overview.spec.ts` calendar tests, `home-attention*.spec.ts`,
   `src/web/calendar/HomeAgendaCard.tsx`, `src/web/telephony` HomeCards).
5. Reminder internals not read line by line: `src/clock/reminders.vibe:140-385`, `schedule.ts`,
   `drafts.vibe`, `reminder-page.vibe`, `deletions.vibe`, `agent-review.vibe`,
   `workflow-notices.vibe`, `reminder-taps.vibe:66-132`; against legacy
   `reminder-timing-review.spec.ts` (v2 alert lead / no-alert), `browser-reminder-recurrence.spec.ts`
   (saved zone), `quint-reminder-reopen.test.mjs` (DST gap), `ReminderTodoAttempt.qnt`,
   `reminder-deletions.test.mjs`, `RetainedReminderTapAdmission.qnt`, `ReminderOpenIntent.qnt`.
6. Native conformance: `NativeClockReview.qnt`, `NativeReminderDelivery.qnt`,
   `CanonicalNotificationTap.qnt`, `HomeInstanceHandoff.qnt`, `CombinedAgentLauncher.qnt` against the
   Java (only class lists and diffs were compared; `ClockReviewMarks.java`, `StoreChanges.java`,
   `ElizaNotificationsPlugin.java` are new and unread).
7. AOSP/scripts tests: `aosp-launcher-policy`, `aosp-product-lock`, `aosp-provisioning-overlay`,
   `cuttlefish-launcher-postboot`, `pilot-install-lock`, `dev-local-launcher`,
   `native-permission-runner`, `native-reminder-runner`, `native-reminder-recovery-runner` (files
   are present in the port tree; whether their scripts still exist was not checked).
8. `spec/shell/{landing,routes,handoffs}.md` and `src/shell/{landing,ownerRoutes,handoffs,surfaceSheets,assistantHost}.vibe`
   (`CallbackLanding.qnt`, owner route table).
9. `src/web/shell/NotificationsPage.tsx` / `NotificationsSettings` (mirror settings UI) against
   `test/browser/dev-notifications.spec.ts`.
10. Legacy `ShellScreen.qnt` lock-screen rules (locked frame refuses Camera, lock-entry canaries) and
    `HomeSurface.qnt` (agenda memo/storage probe); `LauncherObserver.qnt`/`LauncherOwnership.qnt`
    now live upstream in `eliza-vs/packages/os/src/bridges/system.vibe`, which was only skimmed.
11. Copy differences (walkthrough headings, Ready card lines, card wording) were not compared.

## Native channel header wire (2026-11-23, from the eliza header branch session; not merged yet)
- The renderer passes optional `headers?: Record<string,string>` to ElizaAgent `request` and `requestStream`. The client side uses RuntimeJsonBridge.request/requestStream and TurnTransport `headers`.
- Only these headers cross the native channel, matched case-insensitively and bounded in size and count: `x-eliza-device-capabilities`, `x-eliza-device-*` (installation, enrollment, protocol) and `x-elizaos-client-id`. Every other header, including auth and hop-by-hop headers, is dropped.
- DeviceEnrollment.headers() and the capabilities header must produce exactly those names, as lower-case keys with plain string values.
- Settled 2026-11-23:
  - Headers use lower-case names: `x-elizaos-client-id` and `x-eliza-device-<words>`. Values are printable ASCII. At most 16 headers and 8192 bytes in total.
  - Device headers whose last word is key/token/secret/password/signature never cross, EXCEPT `x-eliza-device-key`. That one is allowed only when it matches ^[a-f0-9]{64}$, because the agent's enrollment identifies the device by `x-eliza-device-id` (= agentId) plus `x-eliza-device-key`.
  - DeviceEnrollment.headers() must send x-eliza-device-id, x-eliza-device-key, x-eliza-device-capabilities and x-elizaos-client-id.
  - The API is `headers?: Record<string,string>` on ElizaAgent request/requestStream and TurnOptions.headers. Refusals are RouteRefused (a disallowed header), TooLarge, and InvalidHeaders (client side).
- Settled & MERGED (#40310 2f409d5d020): headers go on ElizaAgent request/requestStream (os AgentRoute.headers) and agent client request/stream + TurnOptions.headers. This needs vendor at or after 2f409d5d020; the final alpha verify repins.
