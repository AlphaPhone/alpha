# test/browser/voice-entry-context.spec.ts
- Lines: 43 | Kind: Playwright chromium, 1 test; real UI with a captured shell (`Component.prototype.renderVals` patch) used to poll `swallowed()`, and `connectionController.close()` imported in-page (s2 r13) | Verdict: MERGE into `journeys/voice.spec.ts`
- Covers: starting voice from an open note when voice is unavailable keeps the note open and unchanged, keeps the agent context's selected object (note at the same revision), returns to an empty typing composer and sends nothing. Duplicates: `agent-context*` specs check the context envelope; none combines it with voice entry. Callers/importers: chromium; imports `helpers/legacy-notes`, `./voice-fixture` (`silentMicrophone`, `agentContext`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 13 | A1 | `openLegacyNotes` selects "Previous notes" (deleted, D1). | Open the current Notes source and create the note there. | Low |
| 2 | 20-21 | P3 / T6 | Patches `Component.prototype.renderVals` to capture the shell and polls `shell.swallowed()` (an internal gesture fence) before pressing Talk. | Wait for the conversation sheet to settle (animations finished), as other specs do. | Low |
| 3 | 36-39 | T4 | The selected-object poll and the field checks are repeated twice verbatim. | Once. | None |
| 4 | 8 | T8 | `test.describe.configure({timeout:120000})` "on a loaded machine". | Default timeout once setup is lighter. | None |

## Proposed end state
One case in `journeys/voice.spec.ts`: "voice entry from an open note when voice is unavailable keeps the note and its context, returns to typing and sends nothing", on the current Notes source, without shell capture. Delete this file.
