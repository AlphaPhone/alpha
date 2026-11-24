# test/browser/journey-e-browser-credentials.spec.ts
- Lines: 278 | Kind: Playwright journey, `chromium` dev profile, 1 test with 8 `test.step`s (240 s); real UI throughout, test-owned HTTP server on 127.0.0.1, Google search fulfilled by `page.route`; two in-page backdoors | Verdict: KEEP as the core of `journeys/browser.spec.ts` (password steps may sit in `journeys/settings.spec.ts`)
- Covers: navigate, search, Back/Forward; tabs and switching; Read aloud hands only the reviewed excerpt to local speech and never runs page script; a page that navigates itself during review retires the review and the menu refuses reading of the unknown document; a page with a password field is refused for reading and questions; plain-HTTP page refused for questions; private tab marked, out of history, gone after reload; password manager states (autofill unavailable), development provider install/select/unlock/fill/lock, only the provider choice persists. Duplicates: `browser-navigation.spec.ts`, `reading-sensitive.spec.ts`, `browser-host-disclosure.spec.ts`, `password-manager.spec.ts`, `password-provider-setup.spec.ts`, `password-provider-storage.spec.ts`, `journey-core-loops.production.spec.ts` "loops E and J05 in the web build". Callers/importers: none; no helper imports.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 76-80 | P3/T6 | Overwrites `BrowserVoice.prototype.synthesizeLocal` in-page (imported from `/src/browser/voice.ts`) to record text and throw "Fixture terminal". | Use the shared speech fixture (`voice-fixture.ts` `localBrowserVoice`, used by journey B) so the status text comes from the real path. | Low: the assertion on "Fixture terminal" status changes to the fixture's terminal text. |
| 2 | 66, 236, 270-273 | T6 | `providerDocument` imports `preference-documents.ts` to prove no password value is stored. That is a real security property. | Keep, but read the persisted document by key through a harness storage helper rather than importing the module. | Low |
| 3 | 26-53 | C5 | The in-process page server (with held responses) is local to this spec; other browser specs start their own. | Move to a `pageServer` fixture in the harness (worker-scoped). | none |
| 4 | 226-277 | T4 | Password manager + development provider steps overlap `password-manager.spec.ts` and `password-provider-*.spec.ts`. | Keep them here (entry via Browser menu) and delete the overlapping cases there, or move the steps to the settings journey; one home only. | Low |
| 5 | 135-176 | — | Navigation-during-review uses a held server response, not a sleep or a module call. Good model for other specs. | Keep as is. | none |
| 6 | 1-22 | A8 | 22-line evidence header. | Two lines. | none |

## Proposed end state
- Becomes `journeys/browser.spec.ts` (dev profile) with the same eight steps, using a shared page-server fixture and the shared speech fixture.
- Storage check for "no secret stored" through a harness read by persisted key.
- Overlapping cases in `browser-navigation`, `reading-sensitive`, `password-*` specs are deleted in favour of these steps.
- Expected ~220 lines.
