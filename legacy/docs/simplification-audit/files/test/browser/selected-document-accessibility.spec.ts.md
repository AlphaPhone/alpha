# test/browser/selected-document-accessibility.spec.ts
- Lines: 13 | Kind: Playwright spec (`chromium`, `?mode=dev`); text scale set by calling `BrowserDevice.prototype.setTextScale`, the document opened by `files.openSelected(...)` and a standalone `new BrowserFiles()` instance (T6); 9 tests (2 themes × 2 heights, plus 5 cleanup actions) | Verdict: **MERGE** into `journeys/files.spec.ts` ("open a document" step); **DELETE** the API-only cleanup cases
- Covers: a selected HTML document opens in "Selected document" with a sandboxed (`sandbox=""`) iframe. At 150 % text in 360 px it does not scroll sideways, keeps a 44 px Done in view, scrolls by keyboard, and returns focus to the trigger. The dialog closes on Back, backgrounding, forget, replace and Escape. Duplicates: none for the sandbox assertion. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | T6 | Text scale and opening are done by calling product classes. The trigger focus is set on the Files home button, but the dialog is opened by API. | Set Text size in Settings (harness text-scale helper). Open the file from Files → Internal storage → Open. | Low |
| 2 | 8-13 | T3 / T6 | The cleanup cases build a second `BrowserFiles` instance that the app does not use, and call `forgetSelected`/`openSelected` directly. | Keep Back, Escape and background (user and OS events) as steps. Delete forget and replace (API-only). | Low |
| 3 | 2 | T7 | The theme × height loop gives 4 boots for one layout rule. | One run at 360×360, the hardest case. | none |
| 4 | 6 | – | `sandbox=""` on the iframe is a security property worth keeping. | Keep the assertion. | none |
| 5 | 6 | B5 | Screenshot with no consumer. | Delete. | none |

## Proposed end state
One "open a selected document" step in the files journey: open an HTML file through Files at large text, check the
sandboxed iframe, no sideways scroll, Done in view and 44 px, keyboard scroll and Done restoring focus. Back, Escape and
backgrounding each close it.
