# Chunk test-09: Playwright specs `cloud-*` … `dev-calendar-response` (36 files)

All 36 assigned files exist and were read in full. Per-file reports are under `files/test/browser/`.
Totals: **16 DELETE**, **1 KEEP** (trimmed, moved), **19 MERGE/REWRITE** into journeys or the harness.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `cloud-account-replacement.production.spec.ts` | production journey | MERGE | `journeys/connection-cloud.spec.ts` (both cases; drop personal-setup seed) |
| `cloud-notes-voice-fixture.ts` | helper (5 importers) | MERGE | `harness/plugins/voice.ts` |
| `cloud-personal-intent-storage.spec.ts` | module-in-page | DELETE | with C4 personal Cloud |
| `cloud-personal-onboarding.spec.ts` | test-mocks diagnostics UI | DELETE | with C4 |
| `cloud-setup-migration.spec.ts` | module-in-page, legacy | DELETE | with C4 / D1 |
| `cloud-tts-latency.local.spec.ts` | live (manual) | MERGE | `live/cloud-voice.local.spec.ts` |
| `cloud-tts-streaming.spec.ts` | dev-host integration (own Vite server per test) | KEEP (trim, move) | `dev-host/cloud-speech-stream.spec.ts`, one server, drop unit test 6 |
| `cloud-voice-fixture.ts` | helper (9 importers) | MERGE | `harness/plugins/voice.ts` |
| `cloud-voice-live.local.spec.ts` | live (manual) | MERGE | `live/cloud-voice.local.spec.ts` |
| `compact-viewport.spec.ts` | UI layout | MERGE | `journeys/accessibility.spec.ts` (3 steps; delete digest-event test) |
| `composer-dispatch.spec.ts` | UI over remote-agent bridge | MERGE | `journeys/chat.spec.ts` on the resident (2-3 cases) |
| `composer-send-focus.spec.ts` | UI + prototype surgery | MERGE | `journeys/chat.spec.ts` (4 cases) |
| `confidentiality-claims.spec.ts` | rendered-copy check (~78 boots) | REWRITE | rule in `scripts/audit-production-bundle.ts` + mock check in the a11y sweep loop |
| `connection-activity-presentation.spec.ts` | UI | MERGE | `journeys/connection-cloud.spec.ts` (1 case) |
| `connection-boundaries.production.spec.ts` | production journeys (~32) | MERGE (+DELETE legacy parts) | `journeys/connection-cloud.spec.ts` (~11) + `journeys/production-gating.spec.ts` (1) |
| `connection-preference-storage.spec.ts` | module-in-page, 3 browsers | DELETE | with C4; drop from `scripts/storage-specs.ts` |
| `connection-startup-presentation.spec.ts` | UI + pure function | MERGE test 1, DELETE test 2 | `journeys/connection-cloud.spec.ts` (resident restart, no chooser flash) |
| `connection.production.spec.ts` | production, web build | MERGE | `journeys/production-gating.spec.ts` (cold start only) |
| `content-review-layout.spec.ts` | layout via direct module calls | MERGE | `harness/a11y.ts expectFits` used inside the journeys that open those dialogs |
| `context-selection.spec.ts` | UI journeys + backdoors | MERGE | `journeys/chat.spec.ts` context block (12 cases) |
| `conversation-selection-storage.spec.ts` | module-in-page, 3 browsers | DELETE | carry 2 cases to `journeys/chat.spec.ts`; drop from `storage-specs.ts` |
| `design.spec.ts` | mock-mode render smoke | MERGE | a11y sweep mock-state loop |
| `dev-calendar-alert-boundaries.spec.ts` | simulator (P7) | DELETE | — |
| `dev-calendar-alerts.spec.ts` | simulator (P7) | DELETE | — |
| `dev-calendar-all-day-save.spec.ts` | simulator (P7) | DELETE | — |
| `dev-calendar-assistant.spec.ts` | journey over paired-local bridge | REWRITE | `journeys/calendar.spec.ts` assistant-action table on the resident |
| `dev-calendar-conversion.spec.ts` | simulator editor (P7) | DELETE | — |
| `dev-calendar-cross-tab.spec.ts` | simulator, two tabs | DELETE | — |
| `dev-calendar-editor.spec.ts` | simulator editor (P7) | DELETE | — |
| `dev-calendar-guests.spec.ts` | simulator, web-only guests | DELETE | — |
| `dev-calendar-meeting-lifecycle.spec.ts` | web-only meeting room | DELETE | — |
| `dev-calendar-meeting.spec.ts` | web-only meeting room | DELETE | — |
| `dev-calendar-navigation.spec.ts` | plugin-driven navigation | MERGE 2 / DELETE 4 | `journeys/calendar.spec.ts` (pending-open cover, cancel on leave) |
| `dev-calendar-preferences.spec.ts` | duplicate of `calendar-month-focus` | DELETE | add `textScale:150` to the kept month-dialog step |
| `dev-calendar-recurring-assistant.spec.ts` | journey, verbatim fixture copy | MERGE | `journeys/calendar.spec.ts` assistant-action table (recurring rows) |
| `dev-calendar-response.spec.ts` | web-only guest responses | DELETE | — |

## Behaviour that loses all coverage if the DELETEs happen

Stated plainly; each needs a replacement or an explicit owner "not needed".

1. **Browser development calendar simulator semantics** (alerts at civil midnight, date line, channel suppression,
   editor DST conversion, guest responses, meeting-room media release, two-tab stale save). These are web-only or
   stand-in behaviours; the APK uses native calendar code that these specs never touched. If the simulator stays
   (D19), one dev-surface smoke is enough. **Calendar alert timing on Android has no e2e coverage either way**: it
   needs instrumentation.
2. **Calendar alert tap → exact event** from the shade (only `dev-calendar-alerts` test 1 does it, on the dev
   shade). Add one step to `journeys/notifications.spec.ts` on the production harness with a bridge-seeded calendar
   notice.
3. **Android conversation-selection path** (`runtime/conversation-selection.ts` with plain `localStorage`): never
   covered by the deleted spec (it ran the web document path). The two carried chat cases (saved conversation gone →
   fallback; retirement during creation sends nothing) must run on the Android harness to cover it.
4. **Revocation response shapes** in `connection-boundaries`: keeping 5 of 9 drops e2e coverage of
   `refused-in-body`, `no-content`, `server-error`, `unsupported`. All map to "Signed out here only"; the risk is a
   parser regression that reports one of them as revoked.
5. **Forced web sign-out key cleanup** (`alpha-connection-secrets.v1`): deleted with the A1 cleanup; correct only if
   the current web build never writes that Cloud slot (owner question 3).
6. **Dev-host streamed speech element-drop branch** (`cloud-tts-streaming` test 6) if that test goes.
7. **Confidentiality claims assembled at runtime** escape a bundle string scan; the sweep-level innerText check is
   the backstop only for screens the sweep visits.
8. **Composer "session lapsed before dispatch"** (`composer-dispatch` case 2) has no resident equivalent today.

## Shared helpers worth keeping (proposed homes)

- `harness/plugins/voice.ts`: merge of `cloud-voice-fixture.ts` + `cloud-notes-voice-fixture.ts` (and the other
  five voice fixtures, research P18), at the `AlphaVoiceCloud` bridge boundary instead of `BrowserVoice.prototype`.
- `harness/plugins/agent.ts`: resident agent with an **ordered call log** (needed by the account-replacement and
  sign-out ordering assertions), `proposal(operation)` + action-journal recorder (calendar assistant cases), `hold`
  points for `Agent.start` and `POST /api/conversations`, and a `revoke` mode table.
- `harness/cloud.ts`: `accounts([A,B])`, `expireKey(account)`, Gmail fixture (context-selection mail cases).
- `harness/a11y.ts`: `expectFits(locator, viewport)` (from `content-review-layout`), `expectReachable(locator)`
  (from `dev-calendar-navigation` / `compact-viewport` `elementFromPoint` checks).
- One exported mock start-target list (now copied in `design.spec.ts`, `confidentiality-claims.spec.ts`,
  `accessibility-states.ts`).

## Cross-file actions

- `scripts/storage-specs.ts`: remove `connection-preference-storage` and `conversation-selection-storage`.
- `scripts/audit-production-bundle.ts`: add the forbidden confidentiality-claim regex list.
- C4 deletion must take `cloud-personal-intent-storage`, `cloud-personal-onboarding`, `cloud-setup-migration`,
  `connection-preference-storage`, the legacy arms of `connection.production` / `connection-boundaries.production`,
  the personal-intent lines of `cloud-account-replacement.production`, and `transcribePairedRecording` in
  `cloud-notes-voice-fixture.ts`. After that, `helpers/page-modules.ts` has 4 importers left.
- D1 (legacy Notes) breaks `compact-viewport` and `cloud-notes-voice-fixture` `openNotesRecorder`: both must move to
  canonical Notes before `helpers/legacy-notes.ts` goes.
- `helpers/browser-calendar.ts` `openRetainedCalendarSource` walks React fibers to force
  `calendarAuthority:'browser-local'`; 53 files import the helper. With the dev-calendar DELETEs it loses 11 of
  them. Replace the backdoor with the visible source chooser (`agent-calendar-adapter.ts:179` lists "Browser calendar
  (development)") if the simulator stays.
- Node-side product import `device-record-presentation.ts` disappears from 2 of its 3 spec importers (left:
  `reminder-v2-assistant.spec.ts`).
- `?connections=advanced` in `composer-send-focus` has no reader in `apps/app/src`.

## Owner questions

1. Keep the browser development calendar simulator (editor, guests, responses, meeting room, alerts) at all? If
   yes, one dev-surface smoke; if no, delete it with these specs.
2. Does the desktop dev-host Cloud speech path (`cloud-tts-streaming`) need regression coverage, given the APK uses
   native `AlphaVoiceCloud`?
3. Can the current web build still write a Cloud key into `alpha-connection-secrets.v1`? If not, the forced sign-out
   cleanup and its 5 tests are legacy (A1).
4. Sign-out revocation: keep 5 representative response modes at e2e cost, or all 9?
5. The assistant Calendar action journey executes on the browser `AlphaCalendar` stand-in. Acceptable for the
   journey, or should the production harness fake `AlphaCalendar.executeAgent` at the bridge?
6. Does the resident have an expiring session that makes "refusal before dispatch keeps the draft in its own
   binding" reachable, or is that case retired with remote pairing?
