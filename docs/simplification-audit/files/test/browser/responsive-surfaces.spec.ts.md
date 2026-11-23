# test/browser/responsive-surfaces.spec.ts
- Lines: 271 | Kind: Playwright journey (`chromium`, development server `?mode=mock` / `?mode=dev` with reference fixture data), 9 tests | Verdict: **MERGE** into the same "responsive layout" section of `journeys/accessibility.spec.ts` (chromium file), with Inbox cases in `journeys/inbox.spec.ts` if the area owner prefers
- Covers: Inbox message column and reply draft surviving every size, Inbox split pane and selection, the listening panel matching the text composer geometry in landscape, Photos density, Files preview split (twice), Calendar day column opening the tapped occurrence, and Notes voice/link items opening beside the list. Duplicates: `responsive-surfaces.production.spec.ts` (helpers, Photos density); `inbox-*` split specs. Callers/importers: none. It imports `helpers/mail-actions`, `cloud-notes-voice-fixture`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 69-77 | T6 | The voice test imports `connection-ui.tsx`, `alpha-client.ts` and `browser/voice.ts` in the page and overwrites `getSnapshot`, `prepareVoiceConversation`, `voiceConversationCurrent`, `BrowserVoice.prototype.getRecordingMetrics` and `attachVerifiedTransport`. That is a unit test of the voice panel in a browser. | Drive it through the voice harness plugin (`harness/plugins/voice.ts`) with a connected resident, and keep only the geometry assertions. | Medium |
| 2 | 98 | – | `console.log(JSON.stringify(...))` debug output is left in the test. | Delete. | none |
| 3 | 13-19, 134 | C3 | `box`, `resize`, `inert`, `MATRIX`, `COLUMN` duplicate the production twin. | `harness/layout.ts`. | none |
| 4 | 115-132 | T4 | Photos density duplicates `responsive-surfaces.production.spec.ts:236-245`. The album reflow (≥6 → 2 columns) is the only new check. | Delete the density half and keep the album reflow as one step. | none |
| 5 | 179-197, 249-271 | T4 / T6 | Two Files split tests: one on mock fixtures, and one that imports `/src/platform-plugins.ts` to `importFile` (backdoor seeding). | Keep one. Import the file through the Files UI or `harness/plugins/files.ts` and assert split, inert, focus move and same preview element. | Low |
| 6 | 57-65 | T7 | The Inbox filter 44 px test is tiny. | Fold into the Inbox column test. | none |
| 7 | 53, 107, 175 | B5 | Screenshots with no consumer. | Delete. | none |
| 8 | 20-23 | D5 | `?mode=mock` depends on the reference prototype fixtures (Jordan Park, Maya Chen). That is a dev surface (D6/D19). | Keep while mock mode is retained, behind the dev fixture in `harness/app.ts`. | Low |

## Proposed end state
Five chromium cases in the shared layout section: Inbox column, reply draft and split selection (one test); voice panel
geometry through the voice plugin; one Files split; Calendar tapped-occurrence column; and Notes voice/link beside the
list. Plus the album reflow step. It uses the shared layout helpers, has no `page.evaluate` imports of product modules,
and writes no screenshots.
