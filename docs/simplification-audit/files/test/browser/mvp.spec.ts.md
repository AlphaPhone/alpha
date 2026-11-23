# test/browser/mvp.spec.ts
- Lines: 228 | Kind: grab-bag of Playwright journeys (view sweep, legacy Notes, mock mode, retained digests, theme); project `chromium`, 20 tests (6 sweep + 14) | Verdict: **SPLIT**: sweep → `journeys/home-shell.spec.ts`; mock cases → `journeys/dev-surface.spec.ts`; theme → `journeys/settings.spec.ts`; legacy Notes, folder and retained-digest cases **DELETE**
- Covers: every MVP view opens inside the viewport without page errors and deferred apps are absent; legacy Notes CRUD/Recently deleted/import/download/share/recorder; retained folder records; mock banner and exit; retained digest dialog focus trap; theme persistence vs mock preview; mock account/privacy without Contacts; mock digest/fallback text; `notes:rec` deep link. Duplicates: `canonical-notes.spec.ts` (Notes CRUD, as the comment at line 65 says), `notes-trash*.spec.ts` (Recently deleted), `native-mock-chrome.spec.ts` (mock banner, T4), `appearance-storage.spec.ts` (theme storage). Callers/importers: none; imports `helpers/legacy-notes.ts`, `helpers/retained-digests.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 38-96, 107-116, 133-145, 207-222 | A1 / A2 | Seven tests open the "Previous notes" legacy source (`openLegacyNotes`), which D1/A2 delete. | Delete. Re-base onto canonical Notes only what canonical specs lack: text-file import with exact bytes and invalid-file refusal (if canonical Notes keeps import; owner question), recorder mic refusal, and share options without Messages. | Medium: import/download exact-bytes coverage is lost if canonical Notes has import and no spec re-bases it |
| 2 | 67-81 | A1 | "Retained folder records" preserves folder IDs from removed folder controls. That is a legacy record shape. | Delete with the folder code. | none |
| 3 | 117-132 | A3 / C4 | Retained digest dialog is opened by the `alpha:hosted-digests` window event into `runtime/hosted-digest-ui.tsx` (hosted path, C4). | Delete with C4. | none |
| 4 | 7-37 | T4 / T7 | 6-way matrix (2 themes x 3 widths) of a 10-view walk with a reboot per view. | Two runs (360 light, 1440 dark) in `home-shell`, screenshot at one width. | none |
| 5 | 97-106 | T4 | Mock banner position duplicates `native-mock-chrome.spec.ts`. | Keep one, in `dev-surface`. | none |
| 6 | 146-158 | T4 | Theme persistence partly duplicates `appearance-storage.spec.ts`; the "mock preview does not overwrite" part is unique. | Merge into `journeys/settings.spec.ts` theme step. | none |
| 7 | 160-205, 223-228 | D6 | Mock-mode scope checks depend on simulator fixtures (Contacts, JP/Maya/Priya). | Move to `dev-surface`; drop absence checks for fixtures that D19 removes. | Low |
| 8 | 177-179 | — | Types fixture credentials into a mock Google sign-in form. Labelled mock-only; no request is made. | Keep only if the mock account flow survives D19. | Low |

## Proposed end state
The file is removed. `home-shell` gets the view-accessibility sweep (2 runs). `dev-surface` gets the mock banner/exit, mock account scope,
mock digest and `notes:rec` cases. `settings` gets theme persistence across a mock preview. Legacy Notes, retained folders and
retained digests are deleted with their features. Canonical Notes gains import/recorder/share steps only where canonical specs
lack them.
