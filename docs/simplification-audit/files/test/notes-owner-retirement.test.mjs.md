# test/notes-owner-retirement.test.mjs
- Lines: 164 | Kind: transplant (esbuild/`stripTypeScriptTypes` of `prototype/legacy-notes-access.ts`, `runtime/notes-secure-store.ts` and marker slices of `prototype/agent-adapter.ts` run in `vm` with fake globals) + source-text (line 126-128) | Verdict: DELETE
- Covers: "Previous notes" (legacy Notes source) presence probes, legacy draft retention, legacy agent Notes write fallback and source switching; plus one non-legacy behaviour: the composer draft binding is retired before paint on an owner/history transition (lines 118-125). Duplicates: `test/browser/legacy-notes-access.spec.ts`, `test/notes-pending-editor.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-117, 129-164 | A1, T2 | Every Notes case drives `legacy-notes-access.ts`, `selectNotesSource(shell,'legacy')`, `keepNotesDraft` or the legacy agent path. These are whole-file / branch deletes (delete-candidates A99, B193, B201 → C1; DECISIONS D1). | Delete with the legacy Notes engine. | None |
| 2 | 84, 98, 121, 135, 157 | T2, D7 | Slices `agent-adapter.ts` between literal markers (`  function syncPreviousNotesAvailability(`, `  async function selectNotesSource(`, `    this.connectionUnsubscribe = ...`, `  function armNotesAgentFallback(`, `  p.flushNotesForAppUpdate`), pinning comments and indentation. | Delete. | None |
| 3 | 126-128 | T1 | Regex over sliced source (`firstSendSlotWrites`, `Promise.all(writes)`, `draftRecoveryAbort?.abort`). | Delete. | None |
| 4 | 10-11 | T9 | `ALPHA_NOTES_BASE_ROOT` / `ALPHA_NOTES_CANDIDATE_ROOT` env knobs: no script, workflow or package.json sets them (grep: only this file and `notes-pending-editor`). | Delete with the file. | None |
| 5 | 118-125 | T2 | Composer draft binding retire-before-paint on owner or history change is live chat behaviour, not legacy. | Carry as a journey: switch conversation with an unsent draft, the old draft is not written into the new conversation (`journeys/chat.spec.ts`). Check `composer-dispatch.spec.ts` first; add only if absent. | Medium |

## Proposed end state
File deleted together with `legacy-notes-access.ts` and the legacy Notes engine (Stage A2). The one live behaviour (draft binding retired on owner/history change) is asserted in `journeys/chat.spec.ts` if no existing composer spec already does.
