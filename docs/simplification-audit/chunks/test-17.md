# Chunk test-17: Mail review, Maps, media, message actions, mock mode, MVP sweep, native shells

26 assigned files: 25 present (3,075 lines) and 1 already deleted (`native-calendar-sync-settings.spec.ts`).
All the specs run on the `chromium` project, except the three `*.production.spec.ts` files (`production`) and
`media-copy-intent-storage.spec.ts` (`chromium`, `firefox`, `webkit` via `scripts/storage-specs.ts`).

| File | Lines | Tests | Kind | Verdict | Target |
|---|---|---|---|---|---|
| `mail-review.production.spec.ts` | 268 | 2 | production journey, inline Gmail/agent fake | MERGE | `journeys/inbox.spec.ts` (production) |
| `managed-maps-unavailable.production.spec.ts` | 46 | 6 | production journey | MERGE (6 → 3) | `journeys/maps.spec.ts` (production) |
| `map-label-contrast.spec.ts` | 18 | 6 | T6 constant check (CSS tokens) | DELETE | token pair → `harness/a11y.ts` table |
| `maps-approved-read.spec.ts` | 162 | 7 | integration, paired dev agent, `/src` backdoors | MERGE (7 → 4) | `journeys/maps.spec.ts` (agent share) |
| `maps-chat-cards.spec.ts` | 38 | 2 | T6/D2 shell `setState` injection | REWRITE | `journeys/chat.spec.ts` |
| `maps-event-return-ownership.spec.ts` | 93 | 2 | journey with held boundary read | MERGE | `journeys/maps.spec.ts` (hand-off) |
| `maps-event-return.spec.ts` | 211 | 5 | journey on dev browser Calendar, backdoors | MERGE (+ `calendar-maps-handoff`) | `journeys/maps.spec.ts` (hand-off) |
| `maps-legacy-provenance.production.spec.ts` | 62 | 2 | production journey (live Google-provenance rule, misnamed) | MERGE, rename | `journeys/maps.spec.ts` (production) |
| `maps-list-focus.spec.ts` | 63 | 2 | journey + hash/trace ceremony from Quint checker | MERGE (drop ceremony) | `journeys/maps.spec.ts` (focus) |
| `maps-share-layout.spec.ts` | 9 | 2 | T6 (`shareMap` direct) | MERGE | `journeys/maps.spec.ts` (share) |
| `media-copy-intent-storage.spec.ts` | 32 | 8 x 3 browsers | T6 + A1 legacy, dev-only path | DELETE | remove from `storage-specs.ts` |
| `media-polish.spec.ts` | 104 | 9 | grab bag, T6 dialog openers | MERGE | `journeys/camera-photos.spec.ts` (+1 to chat) |
| `message-actions.spec.ts` | 146 | 14 | journeys, prototype agent fakes | MERGE (14 → ~9) | `journeys/chat.spec.ts`, 1 → `home-shell` |
| `message-reply-edit.spec.ts` | 51 | 10 | journeys + 2 controller-guard cases | MERGE | `journeys/chat.spec.ts` |
| `mock-background-admission.spec.ts` | 68 | 6 | dev mock entry integration | MERGE (6 → 3) | `journeys/dev-surface.spec.ts` |
| `mock-readiness.spec.ts` | 23 | 1 | Java source-text slice (T1) | REWRITE (shared probe asset) | `journeys/startup-permissions.spec.ts` |
| `mvp-workflow-scope.spec.ts` | 56 | 5 | mock-mode journeys | MERGE (5 → 2) | `journeys/workflows.spec.ts` (mock) |
| `mvp.spec.ts` | 228 | 20 | grab bag; 7 legacy-Notes, 1 folder, 1 hosted digest | SPLIT + partial DELETE | `home-shell`, `dev-surface`, `settings`; legacy cases deleted |
| `native-calendar-deletion-routing.spec.ts` | 31 | 2 | T6 prototype patch + platform flip | MERGE (re-base on bridge fake) | `journeys/calendar.spec.ts` |
| `native-calendar-sync-settings.spec.ts` | – | – | missing (already deleted) | – | – |
| `native-cloud-signin.spec.ts` | 367 | 19 | journeys on own Vite composition server | MERGE (19 → ~12) | `journeys/connection-cloud.spec.ts` (sign-in) |
| `native-cloud-subscription.spec.ts` | 733 | ~51 | state matrix on inline Vite composition | KEEP as basis (51 → ~22; 2 A1 deleted) | `journeys/connection-cloud.spec.ts` (plan) |
| `native-insets.spec.ts` | 211 | 11 | layout journeys in WebView iframe | MERGE (11 → ~8) | `journeys/accessibility.spec.ts` (insets) |
| `native-mock-chrome.spec.ts` | 12 | 4 | dev mock layout | MERGE | `journeys/dev-surface.spec.ts` |
| `native-plugin-startup.spec.ts` | 23 | 2 | T6 unit of `platform-plugins.ts` + startup smoke | MERGE test 1, DELETE test 2 | `journeys/startup-permissions.spec.ts` |
| `native-speech-fixture.ts` | 50 | – | support (2 importers, both surviving) | KEEP + MOVE | `harness/voice.ts` |

Counts: KEEP 2 (`native-cloud-subscription` as basis, `native-speech-fixture`), MERGE/REWRITE 20 (including the `mvp` split and the
`native-plugin-startup` part-merge), DELETE 2 whole files (`map-label-contrast`, `media-copy-intent-storage`), missing 1.
About 200 test instances become about 95.

## Corrections to the research report

- `maps-legacy-provenance.production` (research row 859, "legacy-data path: delete") is **not** legacy data. `maps-adapter.ts:61-66`
  and `maps/saved-places.ts:9-14` restrict Google-sourced places whenever the current coverage is not Google, and coverage can
  change on a fresh install. Keep it, under a new name.
- `media-copy-intent-storage` (research row 862, "merge into storage-contract spec") tests a browser-only store.
  `mediaCopyIntentDocument()` throws on Android, and the recovery UI is gated by `testMocksEnabled`, so no production build
  reaches it. Delete it rather than merge it.
- `maps-list-focus` also hashes 10 source files with the Quint `captureInputs` helper and writes trace JSON that nothing reads.
- `native-cloud-subscription` holds two `localApps` migration tests for a reader that no longer exists in `apps/` (A1).

## Behaviours that lose all coverage if the DELETEs happen without a replacement

- **Legacy Notes cases in `mvp.spec.ts`**. Canonical Notes specs already cover CRUD, Recently deleted and sharing. These cases
  have no canonical equivalent: **text-file import with exact bytes (CRLF/BOM/empty), invalid-file refusal, and selected-note
  download with exact bytes**. If canonical Notes keeps import/download, re-base them; otherwise they go with D3 (owner question 1).
- **Unsigned recorder refusing the microphone** (`mvp.spec.ts:133`) runs only on legacy Notes. Re-base it on canonical Notes'
  record button.
- **Android media copy intent** (`localStorage` compare-and-replace path in `media-copy-intent.ts`) is not covered anywhere once
  the browser-path spec goes. The browser path it actually tested is dev-only.
- **Map label contrast**: after the delete, only the a11y sweep would notice a bad palette change, unless the token pair is added
  to the harness contrast table.
- **Registration-order guarantee of `platform-plugins.ts`** (test 2). That is acceptable: it is an 8-line cache.

## Shared helpers worth keeping or creating

- `native-speech-fixture.ts` → `harness/voice.ts` (with the Cloud voice fakes as presets).
- One **composition-server fixture** shared by `native-cloud-signin` (`helpers/native-cloud-signin.ts`) and
  `native-cloud-subscription` (inline `createServer`). Today each file builds a cold Vite graph.
- One **chat agent fake** at the local-agent boundary, replacing the `LocalAgentProtocol.prototype` assignments in
  `message-actions` and `message-reply-edit` and the shell injection in `maps-chat-cards`.
- One **Maps provider fixture** at the Cloud HTTP boundary, replacing `configureMapsProvider` imports in four specs.
  `ElizaSense` defaults belong in `residentStub`.
- One **quiet Android bridge preset**, replacing the catch-all fakes in `native-insets`, `native-plugin-startup` and
  `native-mock-chrome`, plus a `harness/native-frame.ts` WebView iframe helper.
- **`cloudGmail` and `agentProposals` fakes** taken out of `mail-review` and `maps-approved-read`.
- `makeSyntheticVideo(page)`, shared by `media-polish` and `video-edit`.

## Cross-file actions

1. Delete the `mvp.spec.ts` legacy-Notes and folder cases in the same change as A2/D1 (`helpers/legacy-notes.ts` loses an importer).
   Delete the retained-digest case with C4 (`helpers/retained-digests.ts` loses its importer here).
2. Remove `test/browser/media-copy-intent-storage.spec.ts` from `scripts/storage-specs.ts:28`.
3. Move the startup probe expression from `StartupDocumentProbe.java` to an androidTest asset read by both the Java probe and
   the spec; update `scripts/ci/affected.ts`.
4. Drop the `captureInputs` import from `maps-list-focus` (one fewer test importing `specs/quint/refinement/check-traces.mjs`).
5. Fold `calendar-maps-handoff.spec.ts` (other chunk) into the same Maps hand-off block, re-based on `openCanonicalCalendar`.
6. Drop the `AlphaHostedResults` barrier from mock-admission tests if C4 deletes hosted background results.
7. After D2/D19, remove the absence checks for Wallet/Messages/Contacts simulator fixtures in `mvp-workflow-scope` and `mvp`.

## Owner questions

1. Does canonical Notes keep local text-file import and single-note download? If yes, the exact-bytes cases are re-based. If no
   (D3), they are deleted.
2. Should `maps-event-return` move from the dev browser Calendar provider to the canonical agent Calendar, so all Maps hand-off
   tests use the product path?
3. Is the Android media-copy recovery (`Check pending save`) worth a journey on the flag-off Android composition?
4. `maps-approved-read` uses the dev pairing harness ("Local development agent" + pairing code). Can it move to the resident
   agent so D5's pairing harness can go?
