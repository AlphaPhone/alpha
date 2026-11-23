# test/browser/journey-j05-web-research-note.spec.ts
- Lines: 189 | Kind: Playwright journey, `chromium` (`/?mode=dev`), 3 tests; dev agent profile with scripted reply, Playwright-fulfilled public page, legacy Notes source | Verdict: MERGE test 2 into `journeys/browser.spec.ts`; DELETE tests 1 and 3
- Covers: reviewed page excerpt → agent answer → explicit Save leaves one web-linked note (test 1); cross-origin read denied → pasted text reviewed instead (test 2); navigating closes the open review (test 3). Duplicates: `journey-core-loops.production.spec.ts:646` (J05 on Android: excerpt, resident answer, explicit Save, one web-linked note) and `:752` (navigation closes the review), `web-summary-note.spec.ts`. Callers/importers: none; imports `openLegacyNotes`, `openConnectionDiagnostics`, `returnToApps`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 30, 47, 83 | A1 | Uses the "Previous notes" source (`openLegacyNotes`) and reads `readBrowserNotesRaw` from the legacy store; D1 deletes both. | Carried case opens current Notes via `helpers/canonical-notes.ts`. | Medium: depends on where browser-build summary notes are saved after A2. |
| 2 | 99-137, 165-189 | T4 | Tests 1 and 3 repeat the production J05 cases on the dev build. | Delete. | Low. |
| 3 | 170, 179 | T6 | Test 3 drives navigation by importing `platform-plugins` and calling `AlphaBrowser.navigate`. | Gone with the test. | - |
| 4 | 139-161 | - | Pasted-text fallback when the credential-free re-read is refused by CORS is browser-build only and covered nowhere else. | Carry as one test. | Low. |
| 5 | 31 | T6 | Agent messages read via `development-agent-document.ts` import. | One harness helper shared with J03. | Low. |

## Proposed end state
File deleted. `journeys/browser.spec.ts` gains "cross-origin page: pasted excerpt is reviewed and saves one web-linked note", on the dev project with the dev agent profile, using canonical Notes helpers.
