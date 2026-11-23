# Chunk test-14: Home and Inbox Playwright specs

28 files (26 specs, 2 support modules), about 3,200 lines. All exist in the worktree. Reports are under
`files/test/browser/`. These are all Playwright files. None are host tests, scripts, workflows or formal models.

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| home-app-library.spec.ts | 477 | journey, chromium, inline native stub | MERGE (basis) | `journeys/home-shell.spec.ts` launcher |
| home-assistant-surface.spec.ts | 28 | dev `?surface=` run mode | DELETE | 3 assertions → home-shell assistant case |
| home-attention.production.spec.ts | 20 | production | MERGE | `journeys/production-gating.spec.ts` (fresh Home) |
| home-attention.spec.ts | 100 | chromium, mixed UI + `/src` imports | MERGE (1 of 5 cases) | `journeys/home-shell.spec.ts` overview |
| home-brief-result.production.spec.ts | 257 | production journey, bridge stub | KEEP, split | `journeys/workflows.spec.ts` (digest→brief) + `journeys/calendar.spec.ts` (canonical Home card) |
| home-calendar-density.spec.ts | 41 | layout, 5 params | MERGE (3 params) | `journeys/calendar.spec.ts` |
| home-chat-anchor.spec.ts | 65 | layout/gesture | MERGE | `journeys/home-shell.spec.ts` chat-over-Home |
| home-compact-scroll.spec.ts | 56 | layout | MERGE test 2, drop test 1 | `journeys/accessibility.spec.ts` |
| home-daily-overview.production.spec.ts | 31 | production | MERGE (survivor of the twin) | `journeys/production-gating.spec.ts` |
| home-daily-overview.spec.ts | 470 | unit-in-browser (30+ `/src` imports) | REWRITE (~5 cases), rest DELETE | `journeys/home-shell.spec.ts` overview |
| home-inbox.spec.ts | 219 | chromium, in-page Cloud fake + cache internals | MERGE (~6 of 19) | `journeys/inbox.spec.ts` Home card |
| home-landscape.spec.ts | 76 | journey | MERGE | `journeys/home-shell.spec.ts` orientation |
| home-launcher.spec.ts | 111 | chromium, browser device | MERGE test 1, DELETE 2–4 | `journeys/home-shell.spec.ts` |
| home-native-launcher.spec.ts | 324 | journey, inline native stub | MERGE | `journeys/home-shell.spec.ts` (+ permissions case → `journeys/startup-permissions.spec.ts`) |
| home-overlay-stability.spec.ts | 37 | gesture | MERGE | `journeys/home-shell.spec.ts` (with chat-anchor) |
| home-workflows.spec.ts | 61 | chromium, prototype-patched protocol | MERGE | `journeys/workflows.spec.ts` Home card |
| host-reminder-recovery.spec.ts | 9 | unit-in-browser, skipped unless `VITE_LOCAL_AGENT=1` | REWRITE as Node integration or DELETE | `test/local-agent-storage.integration.test.ts` |
| hosted-harness.ts | 56 | support | KEEP, MOVE | `harness/local-agent.ts` |
| inbox-attachment-layout.spec.ts | 36 | layout, 4 params | MERGE (1 run) | `journeys/inbox.spec.ts` attachment review |
| inbox-compose-layout.spec.ts | 28 | journey, dev Inbox | MERGE | `journeys/inbox.spec.ts` compose/local draft |
| inbox-draft-navigation.ts | 6 | support | MERGE | `harness/nav.ts` |
| inbox-folders-compatibility.production.spec.ts | 29 | production journey | MERGE (2 cases) | `journeys/inbox.spec.ts` production describe |
| inbox-folders-drafts.spec.ts | 141 | journey, in-page Cloud fake | MERGE | `journeys/inbox.spec.ts` |
| inbox-hostile-attachment.spec.ts | 287 | security journey, real `CloudProtocol` validation | KEEP | `journeys/inbox.spec.ts` › hostile attachments |
| inbox-message-layout.spec.ts | 19 | journey | MERGE | `journeys/inbox.spec.ts` |
| inbox-owner-fence.spec.ts | 33 | journey + `crypto.subtle` patch | MERGE | `journeys/inbox.spec.ts` owner safety |
| inbox-read-cancel-draft.spec.ts | 103 | journey, 7 cases | MERGE (4 cases) | `journeys/inbox.spec.ts` |
| inbox-save-attachment.spec.ts | 27 | journey | MERGE (2 of 4 cases) | `journeys/inbox.spec.ts` › hostile attachments |

Counts: KEEP 3 (`home-brief-result.production`, `inbox-hostile-attachment`, `hosted-harness`), DELETE 1
(`home-assistant-surface`), MERGE/REWRITE 24. About 60 % of the lines can go once merged. Most of the saving comes
from `home-daily-overview` (470 → ~150), the duplicate brief, calendar and workflow cases, and the light/dark ×
viewport loops.

## Corrections to the research report (`research/tests-browser.md`)
- `inbox-folders-compatibility.production`: the research calls this a "legacy-data path" to delete. That is wrong.
  Here "legacy" means a WebView with no Popover API, not old app data. Keep it while WebView 113 is a supported target
  (`apps/app/src/lib/abort.ts` still carries a WebView 113 fallback).
- `home-launcher` test 3 ("upgraded install keeps favorites under older view ids") really is legacy data (D1). It is
  also a test of the upstream launcher migration in `.eliza/client-features`, because no local code maps
  `alpha:workflows`. DELETE it, and list the upstream migration as a D14 follow-up.
- `hosted-harness.ts`: its "Scheduled digests" panel is still live (`runtime/hosted-digest-ui.tsx:629`, opened
  from a notification). Only its Home/Workflows entry was retired. The helper stays.
- `home-daily-overview` should not be the basis of the Home overview journey. It is mostly module calls made in the
  page. Rebuild the overview from its Agent Calendar cases and from `home-brief-result.production`, which uses the
  real delivery path.

## Behaviours that lose coverage if the DELETEs happen without replacement
- Home calendar card on the **browser (test-mocks) calendar** source: accessible name, hidden calendar, failure and
  retry, and cross-midnight reminder attribution. The Agent Calendar variants that are kept cover the product path.
  Only the dev simulator source loses its coverage. This is intended.
- **Retained-digest module state** (`latestRetainedDigest`, digest panel publish/withdraw on disconnect,
  `home-daily-overview.spec.ts:406-427`). Card-level coverage stays in `home-brief-result.production`. The
  withdraw-on-disconnect behaviour needs one step in the workflows journey: disconnect, then the brief card is gone.
- **Inbox read-cache internals** (expired cache not restored, owner change during a held restore, preserved body and
  folder bytes; `home-inbox.spec.ts:58-103,187-200`). These need a Node integration test of
  `runtime/service-read-cache-store.ts` with a real IndexedDB shim, or the owner accepts the loss.
- **Dev host journal reminder recovery** (`host-reminder-recovery`). It is lost if deleted rather than ported. It
  applies to the development journal only.
- **Product palette on body-appended dialogs** (`home-launcher.spec.ts:92-111`). Replace it with one colour assertion
  on a real review dialog in the Notes or Calendar journey.

## Shared helpers worth building (harness)
- `harness/native-bridge.ts`: one parameterised Capacitor stub as a `test.extend` fixture. It replaces the two inline
  stubs (`home-app-library.spec.ts:11-72` and `home-native-launcher.spec.ts:9-67`). It covers inventory, refusals,
  default dialer, notifications, microphone, assistant surface, insets, update state and secure slots. It also lets
  `home-overlay-stability` get the native inset from `surfaceInfo`.
- `harness/gmail.ts`: one mailbox fixture, built on the `inbox-hostile-attachment` pattern of faking the transport
  under the real `CloudProtocol`. It replaces 8 in-page copies that swap `connectionController.getCloudClient` and
  `getSnapshot` (home-inbox, home-daily-overview, inbox-folders-drafts, inbox-hostile-attachment,
  inbox-read-cancel-draft, inbox-save-attachment, inbox-attachment-layout, inbox-owner-fence). It needs these
  options: accounts and grants, rows, capabilities, hold/release, fail, owner switch, prepare/dispatch counters, slot
  inspection, and `filesEntries`.
- `harness/nav.ts`: `returnToApps`, `openLocalDraft` (from `inbox-draft-navigation.ts`), `pressBack`, `pressHome`,
  `background(page)`.
- `harness/layout.ts`: `expectReachable(locator)` (from `home-landscape`) and `setTextScale` (one implementation;
  four specs import `BrowserDevice.prototype.setTextScale` directly).
- `seedCompletedAccessSetup` used everywhere. `inbox-hostile-attachment` seeds a `version:1` walkthrough record by
  hand, which breaks if historical walkthrough versions are deleted (A1).
- `harness/local-agent.ts`: from `hosted-harness.ts`.

## Cross-file actions
1. Move both production Home twins (`home-attention.production`, `home-daily-overview.production`) into one case.
2. Delete the brief-card backdoor tests (`home-daily-overview:339-399,406-427`, `home-attention:75-100`) in favour of
   `home-brief-result.production`.
3. Delete the duplicate calendar-failure and workflows-card cases in `home-attention` and `home-daily-overview`.
4. `home-assistant-surface` and `assistant-surface-close.spec.ts` (outside this chunk) are the only users of
   `?surface=assistant` (`main.tsx:394`). Move both to the native stub, then delete that run mode (D5).
5. `host-reminder-recovery` is run by name in `.github/workflows/browser.yml:183`. Update that step when the spec is
   ported or deleted.
6. Drop the unconditional `page.screenshot` / `writeFile(geometry.json)` evidence artefacts across the chunk (B5).
   Keep only the on-failure screenshots.
7. Remove `waitForTimeout` from `home-app-library:226`, `home-compact-scroll:44`, `home-overlay-stability:18`,
   `home-daily-overview.production:21`, `home-daily-overview:101,217,303,322`, `home-native-launcher:311` and
   `inbox-folders-drafts:91` (T8).

## Owner questions
- Is WebView 113 (no Popover API, no `AbortSignal.any`) still a supported runtime? If not, the no-popover case in
  `inbox-folders-compatibility.production` and the abort fallbacks can go.
- Should the development host action journal's `recoverReminder` (dev local-agent storage) keep its own test, ported
  to Node, or be deleted with the dev local-agent path?
- Should the Inbox read-cache owner and expiry rules (`service-read-cache-store.ts`) get a Node integration test? If
  not, the browser cases that test them are deleted and the cache internals have no test.
- Which journey owns the in-app update draft-safety cases (`home-native-launcher.spec.ts:71-181`): home-shell
  (startup path) or settings?
