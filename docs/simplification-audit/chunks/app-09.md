# Chunk app-09 summary

Per-file reports: `docs/simplification-audit/files/apps/app/src/prototype/{agent-adapter.ts,agent-calendar-adapter.ts,asset-manifest.json,assistant-draft-controller.ts}.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/agent-adapter.ts | SPLIT (after deleting legacy notes + dead tiles) into `prototype/agent/{index,composer-send,device-executor,pending-actions,voice-turn,context}.ts` | 2099 | ≈1550 (across the new folder) |
| apps/app/src/prototype/agent-calendar-adapter.ts | SIMPLIFY | 350 | ≈265 |
| apps/app/src/prototype/asset-manifest.json | KEEP (provenance data; move with fixtures per D6) | 308 | ≈308 |
| apps/app/src/prototype/assistant-draft-controller.ts | DELETE (rename shim) | 7 | 0 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Shell` (`any`) | type | agent-adapter.ts:88 | `chat-overlay-motion-adapter.ts:22`, `local-speech-playback.ts:22`, `use-in-email-review.ts:5`, `notes-trash-adapter.ts:15`, `notes-folders-adapter.ts:3`, `calendar-approval-adapter.ts:5`, `maps-chat-adapter.ts:55` | `prototype/shell-types.ts` `ShellHost` |
| `Bag` | type | agent-calendar-adapter.ts:24 | 40 `prototype/` files, 10 `browser/` files | `prototype/shell-types.ts` |
| `AssistantDraftController` | alias | assistant-draft-controller.ts:7 | upstream `DurableDraftController` | import upstream name |
| `alphaDevice`, `elizaSystem` | plugin const | agent-adapter.ts:83-84 | `AlphaDevice` bindings in `native-adapter.ts`/settings (C2) | delete with tiles, else one plugin module |
| inline `registerPlugin('AlphaCalendar')` ×5 shapes, `'AlphaTelephony'` ×4, `'AlphaContacts'`, `'AlphaNotifications'` | plugin const | agent-adapter.ts:853,876,881,903,915,945,1033,1034,1099,1129,1139 | `runtime/calendar-availability.ts`, upstream `named-read.ts` | `runtime/plugins/alpha-calendar.ts`, `alpha-telephony.ts` |
| `selectedCloudName` | helper | agent-adapter.ts:225 | `cloudServiceName(...)` call sites in `connection-ui.tsx`, `settings-adapter.ts` | `runtime/cloud-protocol.ts` |
| `typedSendBinding` / `sendBinding` | helper | agent-adapter.ts:1429, 1694 | each other (identical) | one function |
| `canonicalNotesKey` | helper | agent-adapter.ts:542 | `mapBinding` agent-calendar-adapter.ts:56; `main.tsx:102,430` session tuples | `runtime/session-key.ts` |
| `mapBinding` | helper | agent-calendar-adapter.ts:56 | inline copies `:141-142`; `canonicalNotesKey` | `runtime/session-key.ts` |
| device staleness fences (`current` closures) | helper | agent-adapter.ts:875,880,917,947,964,1049,1057,1065,1098,1106,1112,1137,1148 | ~84 similar closures in `prototype/` | local `deviceFence()`; later one `AbortSignal` per lifetime |
| commit-view-and-resolve closure | helper | agent-adapter.ts:530-532, 1617 | each other | `commitView()` |
| `markerKey` (SHA-256 hex) | helper | agent-calendar-adapter.ts:64 | 23 `crypto.subtle.digest('SHA-256'` sites in `apps/app/src` | delete (legacy); else `apps/app/src/lib/sha256.ts` |
| `DAY`, `legacyDayOffset`, `ymd`, `day` | const/helper | agent-calendar-adapter.ts:42,45,202,335 | civil-day helper ×10 (research P13) | `runtime/civil-date.ts` / upstream time helpers |
| `zone` | helper | agent-calendar-adapter.ts:118 | `currentClockTimeZone` (`runtime/clock-contract.ts`) | reuse `currentClockTimeZone` |
| `range` | helper | agent-calendar-adapter.ts:119 | `calendar-adapter.ts` `rangeFor` | `runtime/agent-calendar-view.ts` |
| `readCacheOwner`/`storedOwner`/bootstrap helpers | helper | agent-calendar-adapter.ts:85-117 | `inbox-cloud-adapter.ts` read-cache owner (same Quint service model) | `runtime/service-read-cache-owner.ts` |
| recurrence scope label map | const | agent-calendar-adapter.ts:262,276 | each other | local `SCOPE_LABEL` |
| `deepOpening` expression | inline | agent-calendar-adapter.ts:310 | `calendar-adapter.ts:174` | main Calendar render only |
| `planActionCard`, `replyNotices`, `REFUSED_BEFORE_OUTPUT` | helper/const | agent-adapter.ts:230-252 | notice helpers in `runtime/action-message-presentation.ts` | `runtime/action-message-presentation.ts` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| Legacy "Previous notes" engine in agent-adapter.ts (`:303-392, 558-637, 646-655, 774-788, 1046-1052, 1061-1096, 1123-1128, 1153-1159, 1267-1322 except 1268-1269, 1325-1331, 1353-1368, 1999-2006, 2025-2039, 2088-2096`, legacy fields) + `legacy-notes-access.ts` | `notesStore` assigned only by `selectNotesSource('legacy')` (`:617`); canonical `vset` refuses list writes (`:1268`); canonical api always sets `notesSourceMode:'canonical'` (`canonical-notes-ui.ts:320,342`) so render returns at `:2087`; DECISIONS D1 | Confirmed reachable only via the "Previous notes" switch; delete per D1 |
| Quick-settings tiles / brightness / `shadeN` filter / `headsOk` (agent-adapter.ts `:82-84, 707, 1248 shade part, 1263, 1537-1589`) | bound only inside `{{simulatedShade}}` (`template.html:4518-4538`), dev only (`model.js:5546`); `headsOk` unbound; `n4` is a fixture id (`fixtures.js:548`) | Confirmed for production; owner Q on future in-app tiles |
| `api.assist` (agent-adapter.ts:1399-1403) | 0 callers (`git grep "assist("` in apps/test) | Confirmed |
| Stale "Until the pin carries … patch" comments + `unknown` casts (agent-adapter.ts:1002-1003,1014-1016,1053-1054) | upstream union includes `NotesOrganizeOperation`, `PhotosViewOperation` (`contract.ts:124,127`) | Confirmed |
| "PLAN section 4", "issue 408" references (agent-adapter.ts:974,1019) | no PLAN.md | Confirmed |
| Wallet terms (agent-adapter.ts:691,695) | AP-13, D2 | Confirmed (with Wallet deletion) |
| `export` on `declineProposal`, `composerNeedsSizing`, `managedGoogleSource`, `calendarErrorText`, `nativeCalendarScope` | no importers except text-slicing test for `composerNeedsSizing` | Confirmed |
| Legacy calendar authority/retention (agent-calendar-adapter.ts `:15, 42-48, 57-59, 64-82, 127-128, 142 legacy terms, 151, 215 legacy choice, 219-224, 235-255, 258, 301-304`) + `runtime/legacy-calendar-preservation.ts` | D1; nothing writes `'legacy-google'` | Confirmed per D1 |
| Second `views.calendar.render` wrapper (agent-calendar-adapter.ts:310) and `calendar-adapter.ts:174` duplicate | same expression; fold into main render | Confirmed |
| `assistant-draft-controller.ts` | alias-only shim, 6 importers | Confirmed |
| `typeof getAppRecordClient` guard (agent-calendar-adapter.ts:84) | method always defined (`connection-ui.tsx:2447`) | Confirmed |

## Cross-file actions
1. **Legacy Notes removal (D1)**: agent-adapter.ts (ranges above), delete `prototype/legacy-notes-access.ts`, `runtime/notes-secure-store.ts` (`LEGACY_NOTES_SOURCE_KEYS`, possibly `SecureNotesStore` draft/collection APIs if only legacy uses them), `notesSourceMode` branches in `camera-adapter.ts`, `voice-adapter.ts` (`:108-110`, `:134` dispatches `alpha:notes-committed` → listener gone), `canonical-notes-ui.ts:340-347` (`olderNotesAction`, `Previous notes` title), `notes-trash-adapter.ts`, `notes-folders-adapter.ts`, `note-origin-adapter.ts`, `workflow-authoring.ts`, `model.js` (1 ref), `runtime/phone-context.ts:16` (`legacy-app-notes-source` kind); `browser/simulated-workflows.ts:36,44` and `browser/workflow-dated-sources.ts:19,23` call `api.localWorkflowNotes`, which is legacy-store-only (must be re-pointed at canonical notes or deleted). Tests/specs: `specs/quint/refinement/application/{previous-notes-availability,notes-coordinator}.mjs`, `specs/quint/legacy/notes-view/*`, `test/previous-notes-source-opening.test.mjs`, `test/browser/legacy-notes-access.spec.ts`, `test/fixtures/previous-notes-source-opening.mjs`, `notes-pending-editor`, `native-secure-slots`, `notes-owner-retirement`, `workflow-canonical-notes`, `notes-trash-read` fixture.
2. **Legacy Calendar removal (D1)**: agent-calendar-adapter.ts, `runtime/agent-calendar.ts` (status union `'transition-required'|'legacy-recovery'`, `legacy` state, `confirmLegacyRetention`, `preservation` ctor arg), delete `runtime/legacy-calendar-preservation.ts`, `settings-adapter.ts:862-868` recovery rows, `runtime/phone-context.ts:16,49` (`legacy-app-calendar-*`), `test/scanned-calendar-handoff.test.mjs:200,337-344`, Quint services manifest/calendar harnesses.
3. **Dead tiles**: agent-adapter.ts, `native-adapter.ts` (`honestTiles`, `tileFactsFromSnapshot`, `tileSettingsPages`, `handoffGate`, `watchReturnToApp` if unused elsewhere), `main.tsx:196-204` `installBrowserCapabilityTiles`, `test/shade-tile-facts.test.mjs`.
4. **Shim removal**: delete `assistant-draft-controller.ts`; edit `agent-adapter.ts:43`, `calendar-edit-draft-adapter.ts:3`, `calendar-form-draft-adapter.ts:3`, `canonical-calendar-drafts.ts:3`, `inbox-unsaved.ts:2`, `browser/calendar-editor-draft.ts:1`; update `test/assistant-draft-dispatch.test.mjs:8`, `test/quint-conformance.test.mjs:147,178`, `test/calendar-view-rules.test.mjs:35`, `specs/quint/refinement/application/{portable,canonical-calendar-editor-close,calendar-adapter-fixture}.mjs`, `specs/quint/{application,services}/manifest.json`, `test/support/feature-parity.mjs:340`.
5. **`calendarAuthorityChoices` → `useAgentCalendar`**: agent-calendar-adapter.ts:213-218,234 and `settings-adapter.ts:868`.
6. **`deepOpening` single owner**: agent-calendar-adapter.ts:310 and `calendar-adapter.ts:174`.
7. **Required shell methods (B2)**: declare `cancelReadReplyCompletions, closeSummaryReview, stopVoiceConversation, resumeReadReplyVoice, retireReadReplyVoice, prepareDeviceReadReview, browserSelection, folderSelection, settingsSelection, calendarSelection, calendarDayObservation, canonicalCalendarDraftEntryBlocker, calendarFormCommitted` on `ShellHost` (`shell-types.ts`), then remove `?.` in agent-adapter.ts, agent-calendar-adapter.ts, `calendar-adapter.ts:265,314`, `reminder-adapter.ts:277,330`, `calendar-edit-draft-adapter.ts:41`.
8. **Shared read-cache owner**: agent-calendar-adapter.ts:85-117 and `inbox-cloud-adapter.ts` (same `serviceReadCache` Quint model `services/manifest.json:3586-3639`).
9. **agent-adapter split**: update path entries in `specs/quint/application/manifest.json` (keep all 29 pinned symbol names) and every refinement harness that reads `apps/app/src/prototype/agent-adapter.ts`; `main.tsx:59` import.
10. **Local `runtime/notes-organize-contract.ts`** (68 lines, imported at agent-adapter.ts:37) duplicates upstream `.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts` (A2) and cites non-existent `PLAN.md section 3` — reviewer of that file should confirm and switch agent-adapter to the upstream guard.
11. **Coded refusals instead of copy matching**: `connection-ui.tsx` `send` refusals (agent-adapter.ts:208-210, 1906) and `runtime/agent-calendar.ts` errors (agent-calendar-adapter.ts:31-41).

## Text/path pins
- agent-adapter.ts: `specs/quint/application/manifest.json` (47 path entries; 29 symbol names listed in the file report), refinement harnesses `specs/quint/refinement/application/{chat-attachments,composer-send,notes-coordinator,pending-action-recovery,previous-notes-availability,shell-coordinator,voice-transcript-follow}.mjs`, `specs/quint/legacy/{chat-input,notes-view,settings-nav}/check-*-refinement.mjs`, `test/support/feature-parity.mjs:338`, ~40 host tests + 5 fixtures + `test/support/attachment-restoration.mjs` + `test/browser/notes-photos-list-focus.spec.ts` (full list in file report); `test/composer-send-ownership.test.mjs:15` slices between `export function composerNeedsSizing(` and `export function installAgentAdapter(`; `test/assistant-draft-dispatch.test.mjs:102` slices the `this.composerDraft=new AssistantDraftController(` line.
- agent-calendar-adapter.ts: `specs/quint/application/manifest.json` (7), `specs/quint/services/manifest.json:3589,3637` (symbol `serviceReadCache`), `specs/quint/legacy/google-connect/check-google-connect-refinement.mjs:164`, `test/support/feature-parity.mjs:339`, `test/scanned-calendar-handoff.test.mjs:16,337-344` (slice markers `const DAY=86400000;` … `export const nativeCalendarScope`), `test/browser-calendar-open-source.test.mjs:7-8` (markers `export const browserCalendarScope=` … `export const deviceCalendarScope=`), `test/calendar-connection-scope.test.mjs:6`, `test/home-cards.test.mjs:197,203`, `test/fixtures/calendar-mounted-editor.mjs:11`, `test/fixtures/canonical-calendar-draft-owner.mjs:16`.
- assistant-draft-controller.ts: see cross-file action 4.
- asset-manifest.json: only `apps/app/src/prototype/README.md:35`.

## New patterns
- None strictly new. Two sub-cases worth naming under existing IDs: (a) **stale "until the pin carries X.patch" notes** — A8 comments plus `unknown` casts that outlived the upstream advance (agent-adapter.ts:1002,1053); search for `Until the pin carries` repo-wide. (b) **Output field consumed by label lookup in another adapter** (`calendarAuthorityChoices` read by `choice.label==='Agent Calendar'` in settings) — D10.

## Owner questions
1. Legacy notes deletion changes refusal copy that mentions "Previous notes" (agent-adapter.ts:1047,1063,1154). What should a native notes query / legacy notes operation / workflow `create_note` say once only agent Notes exist (or should those operation types be refused upstream)?
2. `api.localWorkflowNotes` (used by the dev workflow simulator `browser/simulated-workflows.ts`, `browser/workflow-dated-sources.ts`) works only with the legacy store. Re-implement on canonical Notes, or drop those simulator steps?
3. `cardAct` `reviewDestination==='notes'` (agent-adapter.ts:2025-2039) requires the legacy store and always fails in canonical mode. Is the "Review note" proposal destination still produced by the agent? If yes it needs a canonical implementation; if not, delete it.
4. Quick-settings tile/brightness code: confirm no in-app tile surface is planned (shade is Android SystemUI only) before deleting.
5. Keep the `[Calendar saved startup]` debug diagnostics (agent-calendar-adapter.ts:88) for browser-host development, or remove?
6. `asset-manifest.json`: keep as licence/provenance record (recommended) and move it with the fixtures, or drop it?
