# test/browser/recording-question.spec.ts
- Lines: 118 | Kind: Playwright, chromium (`?mode=dev&tools=1`, development profile agent); real UI for attach/send, but setup writes the Notes store and a synthetic WAV through in-page imports, sends are captured by patching `alphaClient.send`, and test 7 patches a React component's `setState` found through `__reactFiber$` | Verdict: **MERGE** into `journeys/notes.spec.ts` ("voice note → ask Alpha" section)
- Covers: a voice note's transcript can be selected and copied without sending; "Ask Alpha" attaches the transcript to an editable draft without changing the recording; Send carries a compact transcript and `notes` context once; the attachment is restored on the sent message after reload; changing the recording before Send refuses the stale attachment; switching connection retires the draft attachment; a refused send keeps the draft and attachment for retry. Duplicates: none in this chunk; transcript display overlaps notes recorder specs (other chunks). Callers/importers: imports `helpers/connection-diagnostics`, `helpers/legacy-notes`, `app-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11 | A1 | Setup opens Notes through `openLegacyNotes` ("Previous notes"), deleted with the legacy Notes engine (C1). The seeding writes `browser-notes-document` raw JSON via `compareExchange` and calls `retainAudio` with a hand-built 3,244-byte WAV. | Seed one voice note through the current Notes store fixture (`harness/plugins/notes.ts`, with a canned WAV asset) and open Notes normally. | Medium: setup must be rebuilt |
| 2 | 18-21 | T6 | `captureSends` replaces `alphaClient.send` to record text and context. | Record the request at the development agent boundary (the dev profile already answers "Development reply"), e.g. a request log exposed by the dev agent fixture. | Low |
| 3 | 97-110 | T6 | Test 7 walks React fibers to find the shell and wraps `setState` to pause a paint, then replaces `alphaClient.send` with a throwing stub. | Rewrite: make the dev agent refuse the send (busy) and assert draft + attachment are kept and Send retries once. Drop the paint-race; it pins a React implementation detail. | Low |
| 4 | 90 | T6 | Test 6 calls `connectionController.offline()` directly. | Switch connection through Settings → Agent connection. | Low |
| 5 | 68 | T6 | Waits on `connectionController.getSnapshot()` after reload. | Wait for the conversation button / restored message. | none |
| 6 | 5 | T8 | File-wide 60 s timeout. | Default timeout once seeding is a fixture. | none |

## Proposed end state
Seven short steps in `journeys/notes.spec.ts` on one seeded voice note: copy, attach + edit, send with context, reload restores,
stale attachment refused, connection switch retires the draft, refused send keeps draft. No fiber walking, no `alphaClient`
patching, no legacy Notes source.
