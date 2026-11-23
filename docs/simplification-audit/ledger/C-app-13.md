# C-app-13 ledger (stage C, chunk app-13)

Files owned: `apps/app/src/prototype/{inbox-cloud-adapter,inbox-drafts,inbox-provider-controls,inbox-unsaved,keyed-list-focus,local-ocr,local-speech-playback,locale-time,maps-adapter,media-review-controls,mock-attention,model.d}.ts`.
Already deleted by stage A: `legacy-notes-access.ts` (A2), `maps-chat-adapter.ts` (A3). `view.reply`/`module.reply = () => null` were already removed by A3.

## Done

- `mock-attention.ts`: deleted (D4). `git grep` showed no importer: data-adapter.ts already imports `mockAttentionRows` from `./model.js`, and feature-parity.mjs is gone (D15).
- `inbox-drafts.ts`: deleted the unused `SuggestionTarget` alias and the `ComposePrefill` rename (A7/D4). The only importer, inbox-cloud-adapter, now imports `ComposePrefill` from upstream `drafts-controller.ts`. The plugin is now typed `Pick<AlphaMailAttachmentsPlugin,'readSelected'>` (B2 map, C2).
- `inbox-cloud-adapter.ts`:
  - Typed the plugin with `Pick<AlphaMailAttachmentsPlugin,'openReviewed'|'saveReviewed'|'cancel'>` (B2 map).
  - Moved the `attachmentNative` const and the `EmailTarget` type import so all imports come first (NEW import order).
  - `resetAttention(state)` replaces 8 copies of the "no count/source/time" `setAttention` literal (C3).
  - Deleted the `Folder` and `folderQuery` aliases; the code uses `MailboxFolder` and `MAILBOX_FOLDER_QUERY` directly (D4).
  - Deleted the never-called local `fullDate` and the `weekdayName` import (A7).
  - Deleted the `typeof gmailRead !== 'function'` checks (B2).
  - `openView?.()` / `swallowed?.()` are now direct calls (B2; both are on `ShellHost`/`ViewApi`).
  - `openDraft` reuses `draftsStatus()` (C3).
  - `phase` is typed as a literal union (NEW-d).
- `inbox-unsaved.ts`: `sha256Hex(binding)` from `lib/hash` (B1 map R1). The slot string is unchanged.
- `local-ocr.ts`: two imports of the same upstream module merged into one (D13 minor).
- `locale-time.ts`: removed the dead `width` parameters, which were always the default. `monthName`, `weekdayNames` and `monthNames` are folded into `refreshNames`. Output is identical: same `{month:'long'}` / `weekdayName(date)` formats and cache keys. The un-exports were already done earlier.
- `media-review-controls.ts`: the mask URL is built once and assigned to both properties (C3).
- `maps-adapter.ts`:
  - Deleted the template-less values `grid, major, fwy, water, parks, rwy, routeD, doneD, hasRoute, pins, labels, meCss, mapDown, mapUp, sheetSw, sheetTap` (A5/NEW-c). Every `maps.X` binding in template.html was checked; none reads them.
  - Moved `searchRecipients` below the imports.
  - Typed the plugins with `Pick<AlphaDevicePlugin,'openSettings'>`, `AlphaMapsTransportPlugin` and `Pick<AlphaCalendarPlugin,'list'>` (B2 map). The unused `NavigationBridge` import was dropped.
  - `idleLauncher()` is shared by `notificationOpen.ready` and the surface's `showable` (C3; same terms).
  - `launcherCloudMaps` is shared by `bindAgentNavigation`/`keepCloudMapsCoverage` (C3).
- `local-speech-playback.ts` (prototype):
  - Removed the try/catch around `dispatchEvent` (B1/B2).
  - Inlined the `directReadAloud` alias in `renderVals`.
  - `chatOpen(shell)` replaces 5 copies of `['sheet','full'].includes(...)` and `agentBinding()` replaces 5 copies of `JSON.stringify(connectionController.getSnapshot().session)` (C3).

## Deleted tests and formal artefacts

None.

## Pins left broken

None found. The quint manifests reference `prototype/local-speech-playback.ts`, `maps-adapter.ts` and `inbox-*` symbols; no pinned symbol was renamed or removed. `mock-attention.ts` had no manifest entry.

## Skipped

- **No `lib/` or `native/` value imports in prototype-script-loaded files.** inbox-cloud-adapter, inbox-drafts, inbox-provider-controls, maps-adapter and local-speech-playback are evaluated with their imports stripped, and the loaders supply each free name:
  - loaders: `scripts/fixtures/prototype-script.ts` users, `test/fixtures/cloud-voice-view.mjs` (16 tests), `test/local-speech-playback.test.mjs`, quint `map-plane-ownership`, `maps-event-return`, `navigation-progress`.
  - Not applied for that reason: `abortError`/`isAbortError`/`errorCode` in local-speech-playback (B1 R8/R20); `sessionKey` for the owner tuples in inbox-provider-controls, inbox-cloud-adapter and local-speech-playback (B1 R19); the `alphaMapsTransport` singleton in maps-adapter, which stays `registerPlugin<AlphaMapsTransportPlugin>` with the same name, so the same proxy through platform-plugins.
  - Stage E should port those loaders first.
- `inbox-unsaved` `isAndroid`: `test/inbox.test.mjs` bundles the file with a `@capacitor/core` stub that has no `registerPlugin`, and `native.ts` → `platform-plugins` imports it. The bundle would fail.
- `inbox-unsaved`: the save-path `check(value)` (B3 #3) can still throw on text size or content, and those messages reach the UI. The 8 MiB check is Q-UI-26 (Open).
- `inbox-provider-controls`: the mock-mode `disabled` guard is Q-DEV-12 (Open). Owner key: see the loader note above. The one-line `binding` lambda was not reformatted (D9: no formatting in this stage).
- Test-only exports kept because importers exist (brief: delete only with no importer):
  - inbox-cloud-adapter: `openInbox`/`openInboxHandler` (scripts/inbox-adapter-fixture.ts, test-inbox-attention-flow.ts) and the `InboxAttention` alias (inbox-adapter-fixture.ts:33).
  - local-speech-playback: `speakNote` (cloud-voice-view.mjs, voice-replies.test.mjs, browser-cloud-dev.spec.ts).
  - Stage E removes them together with their tests.
- `maps-adapter`:
  - The disposer (`disposed`, `original`, `!module`, return body) is modelled by the MapPlaneOwnership and maps-event-return Quint models (`dispose` action) and used by `test-maps-reroute-freshness`.
  - The version-1 Calendar return (`calendarPlugin`, `mapsEventStillThere`) is Q-CAL-2 (Open).
  - `data-map-diagnostics` and the model `maps` render call are Q-DEV-13 (Open).
  - Removing `notNative/native/hasNativeMap` needs a template.html edit (not owned).
  - The `mapRef` reset vs `dropPlane()` merge was not done: `plane` would become `undefined` after a failed construction, which changes `plane?.update` and the modelled `plane` state.
  - Retire-event constant and `iconUrl`: no shared export exists yet.
- local-speech-playback: `typeof ResizeObserver` kept, because cloud-voice-view.mjs can return a fake transcript element and supplies no ResizeObserver. The `?.()` shell methods were kept, because transplant fixtures omit them. The file split/rename and `speakWithFallback` are stage F / behaviour-risky.
- inbox-cloud-adapter:
  - The split into `inbox/` is stage F and is blocked by text pins.
  - `acceptAccounts`, `dropMailboxView`, `showCachedOrLoad`, `attachmentReview` and `closeAttachment`, and the named TTL constants, were not applied. The subsets differ, and the paging observer reads the locals by name; risky without a dedicated test.
  - `Bag` narrowing (B3) was not done; it needs a typed shell first.
- `model.d.ts`: not retyped. B3 gap 4: `ShellComponent` breaks `main.tsx`'s chat-pull props, and main.tsx is not owned.
- `keyed-list-focus.ts`: no change (KEEP); the move to `lib/` is stage F.

## Verification

- `npx tsc --noEmit`: 14 lines of output, none in owned files or in their importers. The errors are in calendar-* and agent-calendar-adapter, owned by other units.
- `node --test`:

  | test | result |
  |---|---|
  | `test/inbox.test.mjs` | 4/4 |
  | `inbox-operation-guards` | 14/14 |
  | `context-selection` | 9/9 |
  | `gmail-background-binding` | 4/4 |
  | `home-google-connection-source` | 1/1 |
  | `local-speech-playback` | 4/4 |
  | `voice-replies` | 10/10 |
  | `locale-time` | 8/8 |
  | `locale-time-usage` | 2/2 |
  | `maps-chat-markup` | 9/9 |
  | `home-cards` | 17/17 |

- `inbox-draft-copies`: 1/2. The failing case "typing alone writes nothing" uses a stub `inbox-unsaved`, and the A2 ledger already reported it as pre-existing.
- `quint-inbox-provider-drafts`: 1 fail, `spawnSync ETIMEDOUT` (child process timed out on this loaded machine), not an assertion.
- Scripts:

  | script | result |
  |---|---|
  | `node scripts/test-inbox-sent-cleanup.ts` | pass |
  | `test-inbox-multiple-drafts.ts` | PASS |
  | `test-inbox-grant-withdrawal.ts` | PASS |
  | `npx tsx scripts/test-inbox-attention-flow.ts` | PASS |
  | `test-inbox-cloud-flow.ts` | 9/9 |
  | `test-maps-reroute-freshness.ts` | 3/3 |

- Quint replay `replayMapPlaneOwnership` (10 random traces, 160 checkpoints): passed. `checkMapsEventReturn` failed with `spawnSync ETIMEDOUT` inside the Quint checker (environment timeout before any trace ran). maps-connection and maps-share-choice were not reached, so these three are unverified.
- Not run: vite build, `audit:bundle`, Playwright, the full Quint refinement suite, Android (no Android files touched).
